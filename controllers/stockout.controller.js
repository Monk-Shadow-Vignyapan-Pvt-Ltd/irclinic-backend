import { Stockout } from '../models/stockout.model.js'; // Update the path as per your project structure

// Add a new stockin
export const addStockout = async (req, res) => {
    try {
        const { vendorId,inventoryId, totalStock,others, centerId } = req.body;

        // Validate required fields
        if (!vendorId || !inventoryId || !totalStock || !centerId) {
            return res.status(400).json({ 
                message: 'Vendor Id,Inventory ID, Total Stock, and Center ID are required', 
                success: false 
            });
        }

        // Create a new stockin
        const stockout = new Stockout({vendorId, inventoryId, totalStock,others, centerId });

        await stockout.save();
        res.status(201).json({ stockout, success: true });
    } catch (error) {
        console.error('Error adding stockout:', error);
        res.status(500).json({ message: 'Failed to add stockout', success: false });
    }
};

// Get all stockins
export const getStockouts = async (req, res) => {
    try {
        const stockouts = await Stockout.find();
        if (!stockouts) {
            return res.status(404).json({ message: 'No stockouts found', success: false });
        }
        res.status(200).json({ stockouts, success: true });
    } catch (error) {
        console.error('Error fetching stockouts:', error);
        res.status(500).json({ message: 'Failed to fetch stockouts', success: false });
    }
};