import { NonStockInventory } from '../models/nonstockinventory.model.js'; // Update the path as per your project structure

// Add a new non-stock inventory item
export const addNonStockInventory = async (req, res) => {
  try {
    const { inventoryName, centerId, userId } = req.body;

    if (!inventoryName) {
      return res.status(400).json({ message: 'Inventory name is required', success: false });
    }

    const newInventory = new NonStockInventory({ inventoryName, centerId, userId });
    await newInventory.save();

    res.status(201).json({ inventory: newInventory, success: true });
  } catch (error) {
    console.error('Error adding non-stock inventory:', error);
    res.status(500).json({ message: 'Failed to add non-stock inventory', success: false });
  }
};

// Get all non-stock inventory items by centerId
export const getNonStockInventories = async (req, res) => {
  try {
    const { id } = req.params;
    const inventories = await NonStockInventory.find({ centerId: id });
    if (!inventories) {
      return res.status(404).json({ message: 'No inventory items found', success: false });
    }
    res.status(200).json({ inventories, success: true });
  } catch (error) {
    console.error('Error fetching non-stock inventories:', error);
    res.status(500).json({ message: 'Failed to fetch non-stock inventories', success: false });
  }
};

// Get non-stock inventory by ID
export const getNonStockInventoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const inventory = await NonStockInventory.findById(id);
    if (!inventory) {
      return res.status(404).json({ message: 'Inventory item not found', success: false });
    }
    res.status(200).json({ inventory, success: true });
  } catch (error) {
    console.error('Error fetching non-stock inventory:', error);
    res.status(500).json({ message: 'Failed to fetch non-stock inventory', success: false });
  }
};

// Update non-stock inventory by ID
export const updateNonStockInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const { inventoryName, centerId, userId } = req.body;

    const updatedData = {
      ...(inventoryName && { inventoryName }),
      ...(centerId && { centerId }),
      ...(userId && { userId }),
    };

    const updatedInventory = await NonStockInventory.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });

    if (!updatedInventory) {
      return res.status(404).json({ message: 'Inventory item not found', success: false });
    }
    res.status(200).json({ inventory: updatedInventory, success: true });
  } catch (error) {
    console.error('Error updating non-stock inventory:', error);
    res.status(400).json({ message: 'Failed to update non-stock inventory', success: false });
  }
};

// Delete non-stock inventory by ID
export const deleteNonStockInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedInventory = await NonStockInventory.findByIdAndDelete(id);
    if (!deletedInventory) {
      return res.status(404).json({ message: 'Inventory item not found', success: false });
    }
    res.status(200).json({ inventory: deletedInventory, success: true });
  } catch (error) {
    console.error('Error deleting non-stock inventory:', error);
    res.status(500).json({ message: 'Failed to delete non-stock inventory', success: false });
  }
};
