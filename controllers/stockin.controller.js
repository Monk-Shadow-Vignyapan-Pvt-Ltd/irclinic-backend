import { Stockin } from '../models/stockin.model.js'; // Update the path as per your project structure

// Add a new stockin
export const addStockin = async (req, res) => {
    try {
        const { vendorId,inventoryId, totalStock,others, centerId, userId } = req.body;

        // Validate required fields
        if (!vendorId || !inventoryId || !totalStock || !centerId) {
            return res.status(400).json({ 
                message: 'Vendor Id,Inventory ID, Total Stock, and Center ID are required', 
                success: false 
            });
        }

        // Create a new stockin
        const stockin = new Stockin({vendorId, inventoryId, totalStock,others, centerId, userId });

        await stockin.save();
        res.status(201).json({ stockin, success: true });
    } catch (error) {
        console.error('Error adding stockin:', error);
        res.status(500).json({ message: 'Failed to add stockin', success: false });
    }
};

// Get all stockins
export const getStockins = async (req, res) => {
    try {
        const stockins = await Stockin.find();
        if (!stockins) {
            return res.status(404).json({ message: 'No stockins found', success: false });
        }
        res.status(200).json({ stockins, success: true });
    } catch (error) {
        console.error('Error fetching stockins:', error);
        res.status(500).json({ message: 'Failed to fetch stockins', success: false });
    }
};

// Get stockin by ID
export const getStockinById = async (req, res) => {
    try {
        const { id } = req.params;
        const stockin = await Stockin.findById(id);
        if (!stockin) {
            return res.status(404).json({ message: 'Stockin not found', success: false });
        }
        res.status(200).json({ stockin, success: true });
    } catch (error) {
        console.error('Error fetching stockin:', error);
        res.status(500).json({ message: 'Failed to fetch stockin', success: false });
    }
};

// Get stockins by Inventory ID
export const getStockinsByInventoryId = async (req, res) => {
    try {
        const { id } = req.params;
        const stockins = await Stockin.find({ inventoryId: id });
        if (!stockins) {
            return res.status(404).json({ message: 'Stockins not found', success: false });
        }
        res.status(200).json({ stockins, success: true });
    } catch (error) {
        console.error('Error fetching stockins:', error);
        res.status(500).json({ message: 'Failed to fetch stockins', success: false });
    }
};

// Update stockin by ID
export const updateStockin = async (req, res) => {
    try {
        const { id } = req.params;
        const { vendorId,inventoryId, totalStock,others, centerId, userId } = req.body;

        // Build updated data
        const updatedData = {
            ...(vendorId && { vendorId }),
            ...(inventoryId && { inventoryId }),
            ...(totalStock && { totalStock }),
            ...(others && { others }),
            ...(centerId && { centerId }),
            ...(userId && { userId }),
        };

        const stockin = await Stockin.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
        if (!stockin) {
            return res.status(404).json({ message: 'Stockin not found', success: false });
        }
        res.status(200).json({ stockin, success: true });
    } catch (error) {
        console.error('Error updating stockin:', error);
        res.status(400).json({ message: 'Failed to update stockin', success: false });
    }
};

// Delete stockin by ID
export const deleteStockin = async (req, res) => {
    try {
        const { id } = req.params;
        const stockin = await Stockin.findByIdAndDelete(id);
        if (!stockin) {
            return res.status(404).json({ message: 'Stockin not found', success: false });
        }
        res.status(200).json({ stockin, success: true });
    } catch (error) {
        console.error('Error deleting stockin:', error);
        res.status(500).json({ message: 'Failed to delete stockin', success: false });
    }
};
