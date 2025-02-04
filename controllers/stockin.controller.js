import { Stockin } from '../models/stockin.model.js'; // Update the path as per your project structure
import { Inventory } from '../models/inventory.model.js';
import mongoose from "mongoose";

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
        const reversedstockins = stockins.reverse();
        const page = parseInt(req.query.page) || 1;

        // Define the number of items per page
        const limit = 12;

        // Calculate the start and end indices for pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        // Paginate the reversed movies array
        const paginatedstockins = reversedstockins.slice(startIndex, endIndex);
        return res.status(200).json({ 
            stockins:paginatedstockins, 
            success: true ,
            pagination: {
            currentPage: page,
            totalPages: Math.ceil(stockins.length / limit),
            totalstockins: stockins.length,
        },});
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
             totalStock,
             others ,
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


export const dashboardStockins = async (req, res) => {
    try {
        const totalStockins = await Stockin.countDocuments(); // Get total count

        const lastFiveStockins = await Stockin.find({}, { inventoryId: 1,totalStock:1, _id: 1 }) // Select only StockinName
            .sort({ createdAt: -1 }) // Sort by creation date (descending)
            .limit(5); // Get last 5 Stockins
            let inventoryIds = lastFiveStockins.map(stockin => stockin.inventoryId);

        // Convert inventoryIds to ObjectId (only if needed)
        inventoryIds = inventoryIds.map(id => new mongoose.Types.ObjectId(id));

        // Fetch inventory details where inventoryId matches
        const inventories = await Inventory.find(
            { _id: { $in: inventoryIds } }, // Using `_id` instead of `inventoryId`
            { inventoryName: 1 }
        );
    
            // Create a map of inventoryId to inventoryName
            const inventoryMap = inventories.reduce((map, inv) => {
                map[inv._id] = inv.inventoryName;
                return map;
            }, {});
    
            // Map stockins to include inventoryName
            const stockinsWithNames = lastFiveStockins.map(stockin => ({
                _id: stockin._id,
                inventoryId: stockin.inventoryId,
                inventoryName: inventoryMap[stockin.inventoryId] || "Unknown", // Fallback if not found
                totalStock: stockin.totalStock
            }));

        return res.status(200).json({ 
            totalStockins, 
            stockins: stockinsWithNames 
        });
    } catch (error) {
        console.error('Error fetching Stockins:', error);
        res.status(500).json({ message: 'Failed to fetch Stockins', success: false });
    }
};

export const searchStockins = async (req, res) => {
    try {
        const { search } = req.query;
        if (!search) {
            return res.status(400).json({ message: 'Search query is required', success: false });
        }

        const regex = new RegExp(search, 'i'); // Case-insensitive search

        const stockins = await Stockin.find({
            $or: [
                { totalStock: regex },
            ]
        });

        if (!stockins) {
            return res.status(404).json({ message: 'No stockins found', success: false });
        }

        return res.status(200).json({
            stockins: stockins,
            success: true,
            pagination: {
                currentPage: 1,
                totalPages: Math.ceil(stockins.length / 12),
                totalStockins: stockins.length,
            },
        });
    } catch (error) {
        console.error('Error searching stockins:', error);
        res.status(500).json({ message: 'Failed to search stockins', success: false });
    }
};