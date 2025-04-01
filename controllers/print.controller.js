import { Print } from '../models/print.model.js';
import mongoose from "mongoose";

// Add or update print setting by centerId
export const upsertPrint = async (req, res) => {
    try {
        const { leftSignature, centerId } = req.body;

        if (!centerId) {
            return res.status(400).json({ message: 'Center ID is required', success: false });
        }

        const updatedPrint = await Print.findOneAndUpdate(
            { centerId },
            { leftSignature, centerId },
            { new: true, upsert: true, runValidators: true }
        );

        res.status(200).json({ print: updatedPrint, success: true });
    } catch (error) {
        console.error('Error upserting print:', error);
        res.status(500).json({ message: 'Failed to upsert print', success: false });
    }
};

// Get print by centerId
export const getPrintByCenterId = async (req, res) => {
    try {
        const { id } = req.params;
        const centerId = new mongoose.Types.ObjectId(id);
        const print = await Print.findOne({ centerId });

        if (!print) {
            return res.status(404).json({ message: 'Print setting not found', success: false });
        }

        res.status(200).json({ print, success: true });
    } catch (error) {
        console.error('Error fetching print by centerId:', error);
        res.status(500).json({ message: 'Failed to fetch print', success: false });
    }
};
