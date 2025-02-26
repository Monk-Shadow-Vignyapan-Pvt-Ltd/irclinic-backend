import { Consent } from "../models/consent.model.js"; // Update the path as per your project structure

// Add a new consent
export const addConsent = async (req, res) => {
  try {
    const { consentTitle, consentNote, centerId, userId } = req.body;

    // Validate required fields
    if (!consentTitle || !consentNote) {
      return res.status(400).json({ message: "Consent title and note are required", success: false });
    }

    // Create a new consent
    const newConsent = new Consent({
      consentTitle,
      consentNote,
      centerId,
      userId,
    });

    await newConsent.save();
    res.status(201).json({ consent: newConsent, success: true });
  } catch (error) {
    console.error("Error adding consent:", error);
    res.status(500).json({ message: "Failed to add consent", success: false });
  }
};

// Get all consents
export const getConsents = async (req, res) => {
  try {
    const { id } = req.params; 
    const consents = await Consent.find({ centerId: id });
    if (!consents) {
      return res.status(404).json({ message: "No consents found", success: false });
    }
    res.status(200).json({ consents, success: true });
  } catch (error) {
    console.error("Error fetching consents:", error);
    res.status(500).json({ message: "Failed to fetch consents", success: false });
  }
};

// Get consent by ID
export const getConsentById = async (req, res) => {
  try {
    const { id } = req.params;
    const consent = await Consent.findById(id);
    if (!consent) {
      return res.status(404).json({ message: "Consent not found", success: false });
    }
    res.status(200).json({ consent, success: true });
  } catch (error) {
    console.error("Error fetching consent:", error);
    res.status(500).json({ message: "Failed to fetch consent", success: false });
  }
};

// Update consent by ID
export const updateConsent = async (req, res) => {
  try {
    const { id } = req.params;
    const { consentTitle, consentNote, centerId, userId } = req.body;

    // Build updated data
    const updatedData = {
      ...(consentTitle && { consentTitle }),
      ...(consentNote && { consentNote }),
      ...(centerId && { centerId }),
      ...(userId && { userId }),
    };

    const updatedConsent = await Consent.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });
    if (!updatedConsent) {
      return res.status(404).json({ message: "Consent not found", success: false });
    }
    res.status(200).json({ consent: updatedConsent, success: true });
  } catch (error) {
    console.error("Error updating consent:", error);
    res.status(400).json({ message: "Failed to update consent", success: false });
  }
};

// Delete consent by ID
export const deleteConsent = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedConsent = await Consent.findByIdAndDelete(id);
    if (!deletedConsent) {
      return res.status(404).json({ message: "Consent not found", success: false });
    }
    res.status(200).json({ consent: deletedConsent, success: true });
  } catch (error) {
    console.error("Error deleting consent:", error);
    res.status(500).json({ message: "Failed to delete consent", success: false });
  }
};
