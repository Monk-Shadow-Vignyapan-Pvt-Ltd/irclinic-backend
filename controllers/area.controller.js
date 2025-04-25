import { Area } from "../models/area.model.js"; // Update path as needed

// Add a new area
export const addArea = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Area name is required", success: false });
    }

    const newArea = new Area({ name });
    await newArea.save();

    res.status(201).json({ area: newArea, success: true });
  } catch (error) {
    console.error("Error adding area:", error);
    res.status(500).json({ message: "Failed to add area", success: false });
  }
};

// Get all areas
export const getAreas = async (req, res) => {
  try {
    const areas = await Area.find();
    res.status(200).json({ areas, success: true });
  } catch (error) {
    console.error("Error fetching areas:", error);
    res.status(500).json({ message: "Failed to fetch areas", success: false });
  }
};

// Get area by ID
export const getAreaById = async (req, res) => {
  try {
    const { id } = req.params;
    const area = await Area.findById(id);

    if (!area) {
      return res.status(404).json({ message: "Area not found", success: false });
    }

    res.status(200).json({ area, success: true });
  } catch (error) {
    console.error("Error fetching area:", error);
    res.status(500).json({ message: "Failed to fetch area", success: false });
  }
};

// Update area by ID
export const updateArea = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Area name is required", success: false });
    }

    const updatedArea = await Area.findByIdAndUpdate(id, { name }, {
      new: true,
      runValidators: true,
    });

    if (!updatedArea) {
      return res.status(404).json({ message: "Area not found", success: false });
    }

    res.status(200).json({ area: updatedArea, success: true });
  } catch (error) {
    console.error("Error updating area:", error);
    res.status(400).json({ message: "Failed to update area", success: false });
  }
};

// Delete area by ID
export const deleteArea = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedArea = await Area.findByIdAndDelete(id);

    if (!deletedArea) {
      return res.status(404).json({ message: "Area not found", success: false });
    }

    res.status(200).json({ area: deletedArea, success: true });
  } catch (error) {
    console.error("Error deleting area:", error);
    res.status(500).json({ message: "Failed to delete area", success: false });
  }
};
