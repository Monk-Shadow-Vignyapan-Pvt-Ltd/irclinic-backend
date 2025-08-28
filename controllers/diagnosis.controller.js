import { Diagnosis } from "../models/diagnosis.model.js"; // Update the path as per your project structure

// Add a new diagnosis
export const addDiagnosis = async (req, res) => {
  try {
    const { name } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: "Diagnosis name is required", success: false });
    }

    // Create a new diagnosis
    const newDiagnosis = new Diagnosis({ name });
    await newDiagnosis.save();
    res.status(201).json({ diagnosis: newDiagnosis, success: true });
  } catch (error) {
    console.error("Error adding diagnosis:", error);
    res.status(500).json({ message: "Failed to add diagnosis", success: false });
  }
};

// Get all diagnoses
export const getDiagnoses = async (req, res) => {
  try {
    const diagnoses = await Diagnosis.find();
    res.status(200).json({ diagnoses, success: true });
  } catch (error) {
    console.error("Error fetching diagnoses:", error);
    res.status(500).json({ message: "Failed to fetch diagnoses", success: false });
  }
};

// Get diagnosis by ID
export const getDiagnosisById = async (req, res) => {
  try {
    const { id } = req.params;
    const diagnosis = await Diagnosis.findById(id);
    if (!diagnosis) {
      return res.status(404).json({ message: "Diagnosis not found", success: false });
    }
    res.status(200).json({ diagnosis, success: true });
  } catch (error) {
    console.error("Error fetching diagnosis:", error);
    res.status(500).json({ message: "Failed to fetch diagnosis", success: false });
  }
};

// Update diagnosis by ID
export const updateDiagnosis = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Diagnosis name is required", success: false });
    }

    const updatedDiagnosis = await Diagnosis.findByIdAndUpdate(id, { name }, {
      new: true,
      runValidators: true,
    });
    if (!updatedDiagnosis) {
      return res.status(404).json({ message: "Diagnosis not found", success: false });
    }
    res.status(200).json({ diagnosis: updatedDiagnosis, success: true });
  } catch (error) {
    console.error("Error updating diagnosis:", error);
    res.status(400).json({ message: "Failed to update diagnosis", success: false });
  }
};

// Delete diagnosis by ID
export const deleteDiagnosis = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedDiagnosis = await Diagnosis.findByIdAndDelete(id);
    if (!deletedDiagnosis) {
      return res.status(404).json({ message: "Diagnosis not found", success: false });
    }
    res.status(200).json({ diagnosis: deletedDiagnosis, success: true });
  } catch (error) {
    console.error("Error deleting diagnosis:", error);
    res.status(500).json({ message: "Failed to delete diagnosis", success: false });
  }
};
