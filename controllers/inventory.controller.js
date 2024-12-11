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
        res.status(200).json({ inventories, success: true });
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
