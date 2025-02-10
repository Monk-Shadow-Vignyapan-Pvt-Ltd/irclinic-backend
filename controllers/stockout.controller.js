import { Stockout } from '../models/stockout.model.js'; // Update the path as per your project structure

// Add a new stockin
export const addStockout = async (req, res) => {
    try {
        const { vendorId,inventoryId, totalStock,stockinType,lotNo,expiryDate,others, centerId } = req.body;

        // Validate required fields
        if (!vendorId || !inventoryId  || !centerId) {
            return res.status(400).json({ 
                message: 'Vendor Id,Inventory ID, Total Stock, and Center ID are required', 
                success: false 
            });
        }

        // Create a new stockin
        const stockout = new Stockout({vendorId, inventoryId, totalStock,stockinType,lotNo,expiryDate,others, centerId });

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
        const reversedstockouts = stockouts.reverse();
        const page = parseInt(req.query.page) || 1;

        // Define the number of items per page
        const limit = 12;

        // Calculate the start and end indices for pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        // Paginate the reversed movies array
        const paginatedstockouts = reversedstockouts.slice(startIndex, endIndex);
        return res.status(200).json({ 
            stockouts:paginatedstockouts, 
            success: true ,
            pagination: {
            currentPage: page,
            totalPages: Math.ceil(stockouts.length / limit),
            totalstockouts: stockouts.length,
        },});
    } catch (error) {
        console.error('Error fetching stockouts:', error);
        res.status(500).json({ message: 'Failed to fetch stockouts', success: false });
    }
};

export const getStockoutById = async (req, res) => {
    try {
        const { id } = req.params;
        const stockout = await Stockout.findById(id);
        if (!stockout) {
            return res.status(404).json({ message: 'stockout not found', success: false });
        }
        res.status(200).json({ stockout, success: true });
    } catch (error) {
        console.error('Error fetching stockout:', error);
        res.status(500).json({ message: 'Failed to fetch stockout', success: false });
    }
};

export const getStockoutsByVendorId = async (req, res) => {
    try {
        const { id } = req.params;
        const stockouts = await Stockout.find({vendorId: id});
        if (!stockouts) {
            return res.status(404).json({ message: 'No stockouts found', success: false });
        }
        const reversedstockouts = stockouts.reverse();
        const page = parseInt(req.query.page) || 1;

        // Define the number of items per page
        const limit = 12;

        // Calculate the start and end indices for pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        // Paginate the reversed movies array
        const paginatedstockouts = reversedstockouts.slice(startIndex, endIndex);
        return res.status(200).json({ 
            stockouts:paginatedstockouts, 
            success: true ,
            pagination: {
            currentPage: page,
            totalPages: Math.ceil(stockouts.length / limit),
            totalstockouts: stockouts.length,
        },});
    } catch (error) {
        console.error('Error fetching stockouts:', error);
        res.status(500).json({ message: 'Failed to fetch stockouts', success: false });
    }
};


export const updateStockout = async (req, res) => {
    try {
        const { id } = req.params;
        const { vendorId,inventoryId, totalStock,stockinType,lotNo,expiryDate,others, centerId } = req.body;

        // Build updated data
        const updatedData = {
            ...(vendorId && { vendorId }),
            ...(inventoryId && { inventoryId }),
             totalStock,stockinType,lotNo,expiryDate,
             others ,
            ...(centerId && { centerId }),
        };

        const stockout = await Stockout.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
        if (!stockout) {
            return res.status(404).json({ message: 'stockout not found', success: false });
        }
        res.status(200).json({ stockout, success: true });
    } catch (error) {
        console.error('Error updating stockout:', error);
        res.status(400).json({ message: 'Failed to update stockout', success: false });
    }
};

export const searchStockouts = async (req, res) => {
    try {
        const { search } = req.query;
        if (!search) {
            return res.status(400).json({ message: 'Search query is required', success: false });
        }

        const regex = new RegExp(search, 'i'); // Case-insensitive search

        const stockouts = await Stockout.find({
            $or: [
                { totalStock: regex },
            ]
        });

        if (!stockouts) {
            return res.status(404).json({ message: 'No stockouts found', success: false });
        }

        return res.status(200).json({
            stockouts: stockouts,
            success: true,
            pagination: {
                currentPage: 1,
                totalPages: Math.ceil(stockouts.length / 12),
                totalStockouts: stockouts.length,
            },
        });
    } catch (error) {
        console.error('Error searching stockouts:', error);
        res.status(500).json({ message: 'Failed to search stockouts', success: false });
    }
};