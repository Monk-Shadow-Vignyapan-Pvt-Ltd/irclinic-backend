import { Quicknote } from "../models/quicknote.model.js";
import admin from "firebase-admin";
import dotenv from "dotenv";
import { FirebaseToken } from '../models/firebaseToken.model.js';
import { User } from '../models/user.model.js';
import mongoose from "mongoose";
import { io } from "../index.js";

dotenv.config();

const firebaseConfig = JSON.parse(Buffer.from(process.env.FIREBASE_CREDENTIALS, "base64").toString("utf8"));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig),
    });
}

// Add a new quicknote with audio
export const addQuicknote = async (req, res) => {
    try {
        const { notes, quicknoteType, isAppointment, centerId, userId } = req.body;
        
        if (!notes || !quicknoteType) {
            return res.status(400).json({ message: "Notes and quicknoteType are required", success: false });
        }

        // Handle file upload (audio)
        let audio = null;
        let audioType = null;
        if (req.file) {
            audio = req.file.buffer; // Store audio as Buffer
            audioType = req.file.mimetype; // Store MIME type
        }

        const quicknote = new Quicknote({
            notes,
            quicknoteType,
            isAppointment,
            centerId,
            userId,
            audio,
            audioType,
        });

        await quicknote.save();
        io.emit("quickNoteAddUpdate",  { success: true } );
        // Fetch users who should receive notifications
        if(quicknoteType === 'Outside'){
                const firebasetokens = await FirebaseToken.find();
                const users = await User.find();
                const filteredUsers = users.filter(user => user.role === "Super Admin");
        
                const filterTokens = firebasetokens.filter(token =>
                    filteredUsers.some(user => user._id.toString() === token.userId.toString())
                );
        
                const tokens = [
                    ...new Set(
                      filterTokens
                        .filter(token => token.centerId.toString() === centerId.toString())
                        .flatMap(user => [user.webToken, user.mobileToken])  // Include both tokens
                        .filter(token => token)  // Remove undefined or null values
                    )
                  ];

                const notificationMessage = {
                           title: `New Quick Appointment Created, Type: ${quicknoteType}`,
                           body: `${notes}`,
                            type: "Quick Appointment",
                            date: new Date(),
                            appointmentId: quicknote._id,
                            isView:false
                        };

                        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                
                        // Store notifications in each matched user
                        await User.updateMany(
                            { 
                                _id: { $in: filteredUsers.map(user => user._id) },
                                $or: [
                                    { centerId: new mongoose.Types.ObjectId(centerId) }, // Match ObjectId
                                    { centerId: centerId.toString() } // Match string version
                                ]
                            },
                            { 
                                $pull: { notifications: { date: { $lt: sevenDaysAgo } } } // Remove older than 7 days
                            }
                        );

                        await User.updateMany(
                            { 
                                _id: { $in: filteredUsers.map(user => user._id) },
                                $or: [
                                    { centerId: new mongoose.Types.ObjectId(centerId) }, // Match ObjectId
                                    { centerId: centerId.toString() } // Match string version
                                ]
                            },
                            { 
                                $push: { notifications: notificationMessage },
                            }
                        );
                
                        // Send Firebase Notification
                        if (tokens.length > 0) {
                            const message = {
                                notification: {
                                    title: notificationMessage.title,
                                    body: notificationMessage.body
                                },
                                tokens: tokens, // Use tokens array for multicast
                            };
                
                            admin.messaging().sendEachForMulticast(message)
                                .then(response => {
                                    response.responses.forEach((resp, index) => {
                                        if (!resp.success) {
                                            console.error(`Error sending to token ${tokens[index]}:`, resp.error);
                                        }
                                    });
                                })
                                .catch(error => {
                                    console.error("Firebase Messaging Error:", error);
                                });
                        }
                    }
        
                
        res.status(201).json({ quicknote, success: true });
    } catch (error) {
        console.error("Error adding quicknote:", error);
        res.status(500).json({ message: "Failed to add quicknote", success: false });
    }
};

// Get all quicknotes
export const getQuicknotes = async (req, res) => {
    try {
        const { id } = req.params;
        const quicknotes = await Quicknote.find({ centerId: id })// Exclude audio data in list
        const quicknotesWithAudio = quicknotes.map(qn => ({
            ...qn._doc, // Spread MongoDB document fields
            audio: qn.audio ? qn.audio.toString("base64") : null, // Convert Buffer to Base64
        }));
        res.status(200).json({ quicknotes:quicknotesWithAudio, success: true });
    } catch (error) {
        console.error("Error fetching quicknotes:", error);
        res.status(500).json({ message: "Failed to fetch quicknotes", success: false });
    }
};

// Get quicknote by ID (including audio)
export const getQuicknoteById = async (req, res) => {
    try {
        const { id } = req.params;
        const quicknote = await Quicknote.findById(id);

        if (!quicknote) {
            return res.status(404).json({ message: "Quicknote not found", success: false });
        }

        // If audio exists, return it as a downloadable file
        if (quicknote.audio) {
            res.set("Content-Type", quicknote.audioType);
            return res.send(quicknote.audio);
        }

        res.status(200).json({ quicknote, success: true });
    } catch (error) {
        console.error("Error fetching quicknote:", error);
        res.status(500).json({ message: "Failed to fetch quicknote", success: false });
    }
};

// Update quicknote (allows updating audio)
export const updateQuicknote = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes, quicknoteType, isAppointment, centerId, userId } = req.body;

        let updatedData = { notes, quicknoteType, isAppointment, centerId, userId };

        // Check if audio file is included in the request
        if (req.file) {
            updatedData.audio = req.file.buffer;
            updatedData.audioType = req.file.mimetype;
        }

        const quicknote = await Quicknote.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });

        if (!quicknote) {
            return res.status(404).json({ message: "Quicknote not found", success: false });
        }

        res.status(200).json({ quicknote, success: true });
    } catch (error) {
        console.error("Error updating quicknote:", error);
        res.status(400).json({ message: "Failed to update quicknote", success: false });
    }
};

// Delete quicknote
export const deleteQuicknote = async (req, res) => {
    try {
        const { id } = req.params;
        const quicknote = await Quicknote.findByIdAndDelete(id);

        if (!quicknote) {
            return res.status(404).json({ message: "Quicknote not found", success: false });
        }
        io.emit("quickNoteAddUpdate",  { success: true } );

        res.status(200).json({ quicknote, success: true });
    } catch (error) {
        console.error("Error deleting quicknote:", error);
        res.status(500).json({ message: "Failed to delete quicknote", success: false });
    }
};
