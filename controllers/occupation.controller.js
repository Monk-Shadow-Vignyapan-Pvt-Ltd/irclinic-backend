import { Occupation } from "../models/occupation.model.js"; // Adjust path as needed

// Add a new occupation
export const addOccupation = async (req, res) => {
  try {
    const { name } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: "Occupation name is required", success: false });
    }

    // Create a new occupation
    const newOccupation = new Occupation({ name });
    await newOccupation.save();

    res.status(201).json({ occupation: newOccupation, success: true });
  } catch (error) {
    console.error("Error adding occupation:", error);
    res.status(500).json({ message: "Failed to add occupation", success: false });
  }
};

// Get all occupations
export const getOccupations = async (req, res) => {
  try {
    const occupations = await Occupation.find().sort({ createdAt: -1 });
    res.status(200).json({ occupations, success: true });
  } catch (error) {
    console.error("Error fetching occupations:", error);
    res.status(500).json({ message: "Failed to fetch occupations", success: false });
  }
};

// Get occupation by ID
export const getOccupationById = async (req, res) => {
  try {
    const { id } = req.params;
    const occupation = await Occupation.findById(id);

    if (!occupation) {
      return res.status(404).json({ message: "Occupation not found", success: false });
    }

    res.status(200).json({ occupation, success: true });
  } catch (error) {
    console.error("Error fetching occupation:", error);
    res.status(500).json({ message: "Failed to fetch occupation", success: false });
  }
};

// Update occupation by ID
export const updateOccupation = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Occupation name is required", success: false });
    }

    const updatedOccupation = await Occupation.findByIdAndUpdate(
      id,
      { name },
      { new: true, runValidators: true }
    );

    if (!updatedOccupation) {
      return res.status(404).json({ message: "Occupation not found", success: false });
    }

    res.status(200).json({ occupation: updatedOccupation, success: true });
  } catch (error) {
    console.error("Error updating occupation:", error);
    res.status(400).json({ message: "Failed to update occupation", success: false });
  }
};

// Delete occupation by ID
export const deleteOccupation = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedOccupation = await Occupation.findByIdAndDelete(id);

    if (!deletedOccupation) {
      return res.status(404).json({ message: "Occupation not found", success: false });
    }

    res.status(200).json({ occupation: deletedOccupation, success: true });
  } catch (error) {
    console.error("Error deleting occupation:", error);
    res.status(500).json({ message: "Failed to delete occupation", success: false });
  }
};
