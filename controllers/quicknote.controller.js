import { Quicknote } from '../models/quicknote.model.js'; // Update the path as per your project structure

// Add a new quicknote
export const addQuicknote = async (req, res) => {
    try {
        const { notes,isAppointment,centerId, userId } = req.body;

        // Validate required fields
        if (!notes) {
            return res.status(400).json({ message: 'Notes field is required', success: false });
        }

        // Create a new quicknote
        const quicknote = new Quicknote({ notes,isAppointment,centerId, userId });

        await quicknote.save();
        res.status(201).json({ quicknote, success: true });
    } catch (error) {
        console.error('Error adding quicknote:', error);
        res.status(500).json({ message: 'Failed to add quicknote', success: false });
    }
};

// Get all quicknotes
export const getQuicknotes = async (req, res) => {
    try {
        const quicknotes = await Quicknote.find();
        if (!quicknotes) {
            return res.status(404).json({ message: 'No quicknotes found', success: false });
        }
        res.status(200).json({ quicknotes, success: true });
    } catch (error) {
        console.error('Error fetching quicknotes:', error);
        res.status(500).json({ message: 'Failed to fetch quicknotes', success: false });
    }
};

// Get quicknote by ID
export const getQuicknoteById = async (req, res) => {
    try {
        const { id } = req.params;
        const quicknote = await Quicknote.findById(id);
        if (!quicknote) {
            return res.status(404).json({ message: 'Quicknote not found', success: false });
        }
        res.status(200).json({ quicknote, success: true });
    } catch (error) {
        console.error('Error fetching quicknote:', error);
        res.status(500).json({ message: 'Failed to fetch quicknote', success: false });
    }
};

// Update quicknote by ID
export const updateQuicknote = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes,isAppointment,centerId, userId } = req.body;

        // Build updated data
        const updatedData = {
            ...(notes && { notes }),
            ...(isAppointment && { isAppointment }),
            centerId,
            ...(userId && { userId }),
        };

        const quicknote = await Quicknote.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
        if (!quicknote) {
            return res.status(404).json({ message: 'Quicknote not found', success: false });
        }
        res.status(200).json({ quicknote, success: true });
    } catch (error) {
        console.error('Error updating quicknote:', error);
        res.status(400).json({ message: 'Failed to update quicknote', success: false });
    }
};

// Delete quicknote by ID
export const deleteQuicknote = async (req, res) => {
    try {
        const { id } = req.params;
        const quicknote = await Quicknote.findByIdAndDelete(id);
        if (!quicknote) {
            return res.status(404).json({ message: 'Quicknote not found', success: false });
        }
        res.status(200).json({ quicknote, success: true });
    } catch (error) {
        console.error('Error deleting quicknote:', error);
        res.status(500).json({ message: 'Failed to delete quicknote', success: false });
    }
};
