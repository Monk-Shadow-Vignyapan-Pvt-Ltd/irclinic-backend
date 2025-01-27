import { ActivityType } from '../models/activityType.model.js'; // Update the path as per your project structure

// Add a new activity type
export const addActivityType = async (req, res) => {
  try {
    const { activityType, centerId, userId } = req.body;

    // Validate required fields
    if (!activityType) {
      return res.status(400).json({ message: 'Activity type is required', success: false });
    }

    // Create a new activity type
    const newActivityType = new ActivityType({
      activityType,
      centerId,
      userId,
    });

    await newActivityType.save();
    res.status(201).json({ activityType: newActivityType, success: true });
  } catch (error) {
    console.error('Error adding activity type:', error);
    res.status(500).json({ message: 'Failed to add activity type', success: false });
  }
};

// Get all activity types
export const getActivityTypes = async (req, res) => {
  try {
    const activityTypes = await ActivityType.find();
    if (!activityTypes) {
      return res.status(404).json({ message: 'No activity types found', success: false });
    }
    res.status(200).json({ activityTypes, success: true });
  } catch (error) {
    console.error('Error fetching activity types:', error);
    res.status(500).json({ message: 'Failed to fetch activity types', success: false });
  }
};

// Get activity type by ID
export const getActivityTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    const activityType = await ActivityType.findById(id);
    if (!activityType) {
      return res.status(404).json({ message: 'Activity type not found', success: false });
    }
    res.status(200).json({ activityType, success: true });
  } catch (error) {
    console.error('Error fetching activity type:', error);
    res.status(500).json({ message: 'Failed to fetch activity type', success: false });
  }
};

// Update activity type by ID
export const updateActivityType = async (req, res) => {
  try {
    const { id } = req.params;
    const { activityType, centerId, userId } = req.body;

    // Build updated data
    const updatedData = {
      ...(activityType && { activityType }),
      ...(centerId && { centerId }),
      ...(userId && { userId }),
    };

    const updatedActivityType = await ActivityType.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });
    if (!updatedActivityType) {
      return res.status(404).json({ message: 'Activity type not found', success: false });
    }
    res.status(200).json({ activityType: updatedActivityType, success: true });
  } catch (error) {
    console.error('Error updating activity type:', error);
    res.status(400).json({ message: 'Failed to update activity type', success: false });
  }
};

// Delete activity type by ID
export const deleteActivityType = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedActivityType = await ActivityType.findByIdAndDelete(id);
    if (!deletedActivityType) {
      return res.status(404).json({ message: 'Activity type not found', success: false });
    }
    res.status(200).json({ activityType: deletedActivityType, success: true });
  } catch (error) {
    console.error('Error deleting activity type:', error);
    res.status(500).json({ message: 'Failed to delete activity type', success: false });
  }
};
