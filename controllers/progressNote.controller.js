import { ProgressNote } from "../models/progressNote.model.js"; // Update the path as per your project structure

// Add a new progress note
export const addProgressNote = async (req, res) => {
  try {
    const { noteTitle,progressNote, centerId, userId } = req.body;

    // Validate required fields
    if (!noteTitle || !progressNote) {
      return res.status(400).json({ message: "Progress note is required", success: false });
    }

    // Create a new progress note
    const newProgressNote = new ProgressNote({
        noteTitle,
      progressNote,
      centerId,
      userId,
    });

    await newProgressNote.save();
    res.status(201).json({ progressNote: newProgressNote, success: true });
  } catch (error) {
    console.error("Error adding progress note:", error);
    res.status(500).json({ message: "Failed to add progress note", success: false });
  }
};

// Get all progress notes
export const getProgressNotes = async (req, res) => {
  try {
    const progressNotes = await ProgressNote.find();
    if (!progressNotes) {
      return res.status(404).json({ message: "No progress notes found", success: false });
    }
    res.status(200).json({ progressNotes, success: true });
  } catch (error) {
    console.error("Error fetching progress notes:", error);
    res.status(500).json({ message: "Failed to fetch progress notes", success: false });
  }
};

// Get progress note by ID
export const getProgressNoteById = async (req, res) => {
  try {
    const { id } = req.params;
    const progressNote = await ProgressNote.findById(id);
    if (!progressNote) {
      return res.status(404).json({ message: "Progress note not found", success: false });
    }
    res.status(200).json({ progressNote, success: true });
  } catch (error) {
    console.error("Error fetching progress note:", error);
    res.status(500).json({ message: "Failed to fetch progress note", success: false });
  }
};

// Update progress note by ID
export const updateProgressNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { noteTitle,progressNote, centerId, userId } = req.body;

    // Build updated data
    const updatedData = {
        ...(noteTitle && { noteTitle }),
      ...(progressNote && { progressNote }),
      ...(centerId && { centerId }),
      ...(userId && { userId }),
    };

    const updatedProgressNote = await ProgressNote.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });
    if (!updatedProgressNote) {
      return res.status(404).json({ message: "Progress note not found", success: false });
    }
    res.status(200).json({ progressNote: updatedProgressNote, success: true });
  } catch (error) {
    console.error("Error updating progress note:", error);
    res.status(400).json({ message: "Failed to update progress note", success: false });
  }
};

// Delete progress note by ID
export const deleteProgressNote = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedProgressNote = await ProgressNote.findByIdAndDelete(id);
    if (!deletedProgressNote) {
      return res.status(404).json({ message: "Progress note not found", success: false });
    }
    res.status(200).json({ progressNote: deletedProgressNote, success: true });
  } catch (error) {
    console.error("Error deleting progress note:", error);
    res.status(500).json({ message: "Failed to delete progress note", success: false });
  }
};
