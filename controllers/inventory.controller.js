import { Inventory } from '../models/inventory.model.js';

// Add a new inventory item
export const addInventory = async (req, res) => {
    try {
        const { inventoryType, inventoryName,instrumentType, brandName,ignoreStockLevel, stockLevel,unit,centerId, userId } = req.body;

        // Validate required fields
        if (!inventoryType || !inventoryName  || !centerId) {
            return res.status(400).json({ message: 'All required fields must be filled', success: false });
        }

        // Create a new inventory item
        const inventory = new Inventory({
            inventoryType,
            inventoryName,
            instrumentType,
            brandName,
            ignoreStockLevel,
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
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;

    const baseFilter = { centerId: id };

    const medicineFilter = {
      ...baseFilter,
      inventoryType: "Medicine",
    };

    const instrumentFilter = {
      ...baseFilter,
      inventoryType: "Instrument",
    };

    const [
      medicines,
      instruments,
      totalMedicines,
      totalInstruments,
    ] = await Promise.all([
      Inventory.find(medicineFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      Inventory.find(instrumentFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      Inventory.countDocuments(medicineFilter),
      Inventory.countDocuments(instrumentFilter),
    ]);

    return res.status(200).json({
      success: true,
      medicines,
      instruments,
      pagination: {
        currentPage: page,
        totalMedicinePages: Math.ceil(totalMedicines / limit),
        totalInstrumentPages: Math.ceil(totalInstruments / limit),
        totalMedicines,
        totalInstruments,
      },
    });
  } catch (error) {
    console.error("Error fetching inventory items:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch inventory items",
    });
  }
};


export const getAllInventories = async (req, res) => {
    try {
        const { id } = req.params;
        const inventories = await Inventory.find({ centerId: id });
        if (!inventories) {
            return res.status(404).json({ message: 'No inventory items found', success: false });
        }
        return res.status(200).json({ 
            inventories,
            success: true ,
            });
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
        const { inventoryType, inventoryName,instrumentType, brandName,ignoreStockLevel, stockLevel,unit,centerId, userId } = req.body;

        // Build updated data
        const updatedData = {
            ...(inventoryType && { inventoryType }),
            ...(inventoryName && { inventoryName }),
            instrumentType,
            ...(brandName && { brandName }),
            ignoreStockLevel,
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
        const { id } = req.params;
        const totalInventories = await Inventory.countDocuments({ centerId: id }); // Get total count

        const lastFiveInventories = await Inventory.find({ centerId: id }, { inventoryName: 1, _id: 1 }) // Select only inventoryName
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
        const { id } = req.params;
        const { search } = req.query;
        if (!search) {
            return res.status(400).json({ message: 'Search query is required', success: false });
        }

        const regex = new RegExp(search, 'i'); // Case-insensitive search

        const inventories = await Inventory.find({
            centerId: id,
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
