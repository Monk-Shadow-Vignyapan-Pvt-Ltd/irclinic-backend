import { Quicknote } from "../models/quicknote.model.js";
import admin from "firebase-admin";
import dotenv from "dotenv";
import { FirebaseToken } from '../models/firebaseToken.model.js';
import { User } from '../models/user.model.js';
import mongoose from "mongoose";
import { io } from "../index.js";
import sharp from 'sharp';

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
        const { notes, quicknoteType, isAppointment,images, centerId, userId } = req.body;
        
        if (!notes || !quicknoteType) {
            return res.status(400).json({ message: "Notes and quicknoteType are required", success: false });
        }

        // Handle file upload (audio)
        let audio = null;
        let audioType = null;
        if (req.files?.audio?.length > 0) {
            audio = req.files.audio[0].buffer;
            audioType = req.files.audio[0].mimetype;
        }

        const compressAllImages = async (images) => {
            if (!images || !Array.isArray(images)) return [];

            return await Promise.all(
                images.map(async (file) => {
                    try {
                        const compressedBuffer = await sharp(file.buffer)
                            .resize({ width: 1600, withoutEnlargement: true }) // resize only if larger
                            .jpeg({ quality: 95 }) // higher quality
                            .toBuffer();
                        return `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
                    } catch (err) {
                        console.error("Error compressing image:", err);
                        return null;
                    }
                })
            ).then(compressed => compressed.filter(Boolean));
        };
          
          const compressedImages = await compressAllImages(req.files?.images || []);

        const quicknote = new Quicknote({
            notes,
            quicknoteType,
            isAppointment,
            centerId,
            userId,
            audio,
            images:compressedImages,
            audioType,
        });

        await quicknote.save();
        io.emit("quickNoteAddUpdate",  { success: true } );
        // Fetch users who should receive notifications
        if(quicknoteType === 'Outside'){
                const firebasetokens = await FirebaseToken.find();
                const users = await User.find();
                const filteredUsers = users.filter(user => (user.role === "Super Admin" || user.role === "Center Head"));
        
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
                            isView:false,
                            link:"/appointment"
                        };

                        const sevenDaysAgo = new Date();
                        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                        sevenDaysAgo.setHours(0, 0, 0, 0);
                
                        // Store notifications in each matched user
                         await User.updateMany(
                                    {
                                      _id: { $in: filteredUsers.map(user => user._id) },
                                      $or: [
                                        { centerId: new mongoose.Types.ObjectId(centerId) },
                                        { centerId: centerId.toString() }
                                      ]
                                    },
                                    [
                                      {
                                        $set: {
                                          notifications: {
                                            $filter: {
                                              input: { $ifNull: ["$notifications", []] }, // ensures it's always an array
                                              as: "notif",
                                              cond: { $gte: [{ $toDate: "$$notif.date" }, sevenDaysAgo] }
                                            }
                                          }
                                        }
                                      }
                                    ]
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

                        io.emit("notification",  { success: true }  );
                
                        // Send Firebase Notification
                        if (tokens.length > 0) {
                            const message = {
                                notification: {
                                    title: notificationMessage.title,
                                    body: notificationMessage.body
                                },
                                data: { // ✅ Add URL inside "data"
                                    url: "https://console.interventionalradiology.co.in"
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
        
        // Fetch quicknotes and do NOT use async in map
        const quicknotes = await Quicknote.find({ centerId: id,isAppointment:false });

        // Process each quicknote asynchronously
        const quicknotesWithAudio = await Promise.all(quicknotes.map(async (qn) => {
            // Fetch username from User model
            const user = await User.findById(qn.userId).select("username"); 

            return {
                ...qn._doc, // Spread MongoDB document fields
                audio: qn.audio ? qn.audio.toString("base64") : null, // Convert Buffer to Base64
                userName: user ? user.username : "Unknown" // Attach username
            };
        }));

        res.status(200).json({ quicknotes: quicknotesWithAudio, success: true });

    } catch (error) {
        console.error("Error fetching quicknotes:", error);
        res.status(500).json({ message: "Failed to fetch quicknotes", success: false });
    }
};

export const getQuickAppointments = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, search = "", type = "" } = req.query;

        const limit = 10;
        const skip = (page - 1) * limit;

        const query = {
            centerId: id,
            notes: { $regex: search, $options: "i" }
        };

        if (type) {
            query.quicknoteType = type; // Apply type filter only if provided
        }

        const total = await Quicknote.countDocuments(query);

        const quicknotes = await Quicknote.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const quicknotesWithAudio = await Promise.all(
            quicknotes.map(async (qn) => {
                const user = await User.findById(qn.userId).select("username");
                return {
                    ...qn._doc,
                    audio: qn.audio ? qn.audio.toString("base64") : null,
                    userName: user ? user.username : "Unknown"
                };
            })
        );

        res.status(200).json({
            quicknotes: quicknotesWithAudio,
            totalPages: Math.ceil(total / limit),
            currentPage: Number(page),
            totalItems: total,
            success: true
        });

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

        if (!notes || !quicknoteType) {
            return res.status(400).json({ message: "Notes and quicknoteType are required", success: false });
        }

       // const quicknote = await Quicknote.findById(id);
      

        // Handle audio update
         let audio = null;
        let audioType = null;
        if (req.files?.audio?.length > 0) {
            audio = req.files.audio[0].buffer;
            audioType = req.files.audio[0].mimetype;
        }

        const compressAllImages = async (images) => {
            if (!images || !Array.isArray(images)) return [];

            return await Promise.all(
                images.map(async (file) => {
                    try {
                        const compressedBuffer = await sharp(file.buffer)
                            .resize({ width: 1600, withoutEnlargement: true }) // resize only if larger
                            .jpeg({ quality: 95 }) // higher quality
                            .toBuffer();
                        return `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
                    } catch (err) {
                        console.error("Error compressing image:", err);
                        return null;
                    }
                })
            ).then(compressed => compressed.filter(Boolean));
        };
          
          const compressedImages = await compressAllImages(req.files?.images || []);

         const quicknote = await Quicknote.findByIdAndUpdate(id, {
            notes,
            quicknoteType,
            isAppointment,
            centerId,
            userId,
            audio,
            images:compressedImages,
            audioType,
        }, { new: true, runValidators: true });
        io.emit("quickNoteAddUpdate", { success: true });

        // Handle notifications again if Outside
        if (quicknoteType === 'Outside') {
            const firebasetokens = await FirebaseToken.find();
            const users = await User.find();
            const filteredUsers = users.filter(user => user.role === "Super Admin" || user.role === "Center Head");

            const filterTokens = firebasetokens.filter(token =>
                filteredUsers.some(user => user._id.toString() === token.userId.toString())
            );

            const tokens = [
                ...new Set(
                    filterTokens
                        .filter(token => token.centerId.toString() === centerId.toString())
                        .flatMap(user => [user.webToken, user.mobileToken])
                        .filter(token => token)
                )
            ];

            const notificationMessage = {
                title: `Quicknote Updated, Type: ${quicknoteType}`,
                body: `${notes}`,
                type: "Quick Appointment",
                date: new Date(),
                appointmentId: quicknote._id,
                isView: false,
                link: "/appointment"
            };

            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            sevenDaysAgo.setHours(0, 0, 0, 0);

            await User.updateMany(
                {
                    _id: { $in: filteredUsers.map(user => user._id) },
                    $or: [
                        { centerId: new mongoose.Types.ObjectId(centerId) },
                        { centerId: centerId.toString() }
                    ]
                },
                [
                    {
                        $set: {
                            notifications: {
                                $filter: {
                                    input: { $ifNull: ["$notifications", []] },
                                    as: "notif",
                                    cond: { $gte: [{ $toDate: "$$notif.date" }, sevenDaysAgo] }
                                }
                            }
                        }
                    }
                ]
            );

            await User.updateMany(
                {
                    _id: { $in: filteredUsers.map(user => user._id) },
                    $or: [
                        { centerId: new mongoose.Types.ObjectId(centerId) },
                        { centerId: centerId.toString() }
                    ]
                },
                {
                    $push: { notifications: notificationMessage },
                }
            );

            io.emit("notification", { success: true });

            if (tokens.length > 0) {
                const message = {
                    notification: {
                        title: notificationMessage.title,
                        body: notificationMessage.body
                    },
                    data: {
                        url: "https://console.interventionalradiology.co.in"
                    },
                    tokens: tokens,
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

        res.status(200).json({ quicknote, success: true });
    } catch (error) {
        console.error("Error updating quicknote:", error);
        res.status(500).json({ message: "Failed to update quicknote", success: false });
    }
};


export const convertQuicknotetoAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { isAppointment } = req.body;

        if (typeof isAppointment !== "boolean") {
            return res.status(400).json({ message: "Invalid or missing isAppointment value", success: false });
        }

        const quicknote = await Quicknote.findByIdAndUpdate(
            id,
            { isAppointment },
            { new: true, runValidators: true }
        );

        if (!quicknote) {
            return res.status(404).json({ message: "Quicknote not found", success: false });
        }

        io.emit("quickNoteAddUpdate",  { success: true } );

        res.status(200).json({ quicknote, success: true });

    } catch (error) {
        console.error("Error updating quicknote isAppointment:", error);
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
