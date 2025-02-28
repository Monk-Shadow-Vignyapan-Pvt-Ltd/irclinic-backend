import { Speciality } from "../models/speciality.model.js"; // Update the path as per your project structure

// Add a new speciality
export const addSpeciality = async (req, res) => {
  try {
    const { name } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: "Speciality name is required", success: false });
    }

    // Create a new speciality
    const newSpeciality = new Speciality({ name });
    await newSpeciality.save();
    res.status(201).json({ speciality: newSpeciality, success: true });
  } catch (error) {
    console.error("Error adding speciality:", error);
    res.status(500).json({ message: "Failed to add speciality", success: false });
  }
};

// Get all specialities
export const getSpecialities = async (req, res) => {
  try {
    const specialities = await Speciality.find();
    res.status(200).json({ specialities, success: true });
  } catch (error) {
    console.error("Error fetching specialities:", error);
    res.status(500).json({ message: "Failed to fetch specialities", success: false });
  }
};

// Get speciality by ID
export const getSpecialityById = async (req, res) => {
  try {
    const { id } = req.params;
    const speciality = await Speciality.findById(id);
    if (!speciality) {
      return res.status(404).json({ message: "Speciality not found", success: false });
    }
    res.status(200).json({ speciality, success: true });
  } catch (error) {
    console.error("Error fetching speciality:", error);
    res.status(500).json({ message: "Failed to fetch speciality", success: false });
  }
};

// Update speciality by ID
export const updateSpeciality = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Speciality name is required", success: false });
    }

    const updatedSpeciality = await Speciality.findByIdAndUpdate(id, { name }, {
      new: true,
      runValidators: true,
    });
    if (!updatedSpeciality) {
      return res.status(404).json({ message: "Speciality not found", success: false });
    }
    res.status(200).json({ speciality: updatedSpeciality, success: true });
  } catch (error) {
    console.error("Error updating speciality:", error);
    res.status(400).json({ message: "Failed to update speciality", success: false });
  }
};

// Delete speciality by ID
export const deleteSpeciality = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedSpeciality = await Speciality.findByIdAndDelete(id);
    if (!deletedSpeciality) {
      return res.status(404).json({ message: "Speciality not found", success: false });
    }
    res.status(200).json({ speciality: deletedSpeciality, success: true });
  } catch (error) {
    console.error("Error deleting speciality:", error);
    res.status(500).json({ message: "Failed to delete speciality", success: false });
  }
};
