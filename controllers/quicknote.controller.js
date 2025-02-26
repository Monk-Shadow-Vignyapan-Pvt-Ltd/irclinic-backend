import { Quicknote } from "../models/quicknote.model.js";

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

        res.status(200).json({ quicknote, success: true });
    } catch (error) {
        console.error("Error deleting quicknote:", error);
        res.status(500).json({ message: "Failed to delete quicknote", success: false });
    }
};
