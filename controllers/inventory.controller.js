import { Inventory } from '../models/inventory.model.js';

// Add a new inventory item
export const addInventory = async (req, res) => {
    try {
        const { inventoryType, inventoryName, brandName, stockLevel,unit,centerId, userId } = req.body;

        // Validate required fields
        if (!inventoryType || !inventoryName || !stockLevel || !centerId) {
            return res.status(400).json({ message: 'All required fields must be filled', success: false });
        }

        // Create a new inventory item
        const inventory = new Inventory({
            inventoryType,
            inventoryName,
            brandName,
            stockLevel,
            unit,
            centerId,
            userId
        });

        await inventory.save();
        res.status(201).json({ inventory, success: true });
    } catch (error) {
        console.error('Error adding inventory:', error);
        res.status(500).json({ message: 'Failed to add inventory', success: false });
    }
};

// Get all inventory items
export const getInventories = async (req, res) => {
    try {
        const inventories = await Inventory.find();
        if (!inventories) {
            return res.status(404).json({ message: 'No inventory items found', success: false });
        }
        const reversedinventories = inventories.reverse();
        const page = parseInt(req.query.page) || 1;

        // Define the number of items per page
        const limit = 12;

        // Calculate the start and end indices for pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        // Paginate the reversed movies array
        const paginatedinventories = reversedinventories.slice(startIndex, endIndex);
        return res.status(200).json({ 
            inventories:paginatedinventories, 
            success: true ,
            pagination: {
            currentPage: page,
            totalPages: Math.ceil(inventories.length / limit),
            totalinventories: inventories.length,
        },});
    } catch (error) {
        console.error('Error fetching inventory items:', error);
        res.status(500).json({ message: 'Failed to fetch inventory items', success: false });
    }
};

// Get inventory item by ID
export const getInventoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const inventory = await Inventory.findById(id);
        if (!inventory) {
            return res.status(404).json({ message: 'Inventory item not found', success: false });
        }
        res.status(200).json({ inventory, success: true });
    } catch (error) {
        console.error('Error fetching inventory item:', error);
        res.status(500).json({ message: 'Failed to fetch inventory item', success: false });
    }
};

// Update inventory item by ID
export const updateInventory = async (req, res) => {
    try {
        const { id } = req.params;
        const { inventoryType, inventoryName, brandName, stockLevel,unit,centerId, userId } = req.body;

        // Build updated data
        const updatedData = {
            ...(inventoryType && { inventoryType }),
            ...(inventoryName && { inventoryName }),
            ...(brandName && { brandName }),
            stockLevel,
            unit,
            centerId,
            ...(userId && { userId })
        };

        const inventory = await Inventory.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
        if (!inventory) {
            return res.status(404).json({ message: 'Inventory item not found', success: false });
        }
        res.status(200).json({ inventory, success: true });
    } catch (error) {
        console.error('Error updating inventory item:', error);
        res.status(400).json({ message: 'Failed to update inventory item', success: false });
    }
};

// Delete inventory item by ID
export const deleteInventory = async (req, res) => {
    try {
        const { id } = req.params;
        const inventory = await Inventory.findByIdAndDelete(id);
        if (!inventory) {
            return res.status(404).json({ message: 'Inventory item not found', success: false });
        }
        res.status(200).json({ inventory, success: true });
    } catch (error) {
        console.error('Error deleting inventory item:', error);
        res.status(500).json({ message: 'Failed to delete inventory item', success: false });
    }
};


export const dashboardInventories = async (req, res) => {
    try {
        const totalInventories = await Inventory.countDocuments(); // Get total count

        const lastFiveInventories = await Inventory.find({}, { inventoryName: 1, _id: 1 }) // Select only inventoryName
            .sort({ createdAt: -1 }) // Sort by creation date (descending)
            .limit(5); // Get last 5 Inventories

        return res.status(200).json({ 
            totalInventories, 
            inventories: lastFiveInventories 
        });
    } catch (error) {
        console.error('Error fetching Inventories:', error);
        res.status(500).json({ message: 'Failed to fetch Inventories', success: false });
    }
};

export const searchInventories = async (req, res) => {
    try {
        const { search } = req.query;
        if (!search) {
            return res.status(400).json({ message: 'Search query is required', success: false });
        }

        const regex = new RegExp(search, 'i'); // Case-insensitive search

        const inventories = await Inventory.find({
            $or: [
                { inventoryType: regex },
                { inventoryName: regex },
                { brandName: regex },
                { stockLevel: regex },
                { unit: regex },
                
            ]
        });

        if (!inventories) {
            return res.status(404).json({ message: 'No inventories found', success: false });
        }

        return res.status(200).json({
            inventories: inventories,
            success: true,
            pagination: {
                currentPage: 1,
                totalPages: Math.ceil(inventories.length / 12),
                totalInventories: inventories.length,
            },
        });
    } catch (error) {
        console.error('Error searching inventories:', error);
        res.status(500).json({ message: 'Failed to search inventories', success: false });
    }
};
