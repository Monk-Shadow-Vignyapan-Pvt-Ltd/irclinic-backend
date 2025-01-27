import { Activity } from '../models/activity.model.js'; // Update the path as per your project structure

// Add a new activity
export const addActivity = async (req, res) => {
    try {
        const { activityType, activityTitle, assignedTo, notes, comments, centerId, dueDate, userId, status } = req.body;

        // Validate required fields
        if (!activityType || !activityTitle || !assignedTo || !notes || !dueDate) {
            return res.status(400).json({ message: 'All required fields must be filled', success: false });
        }

        // Create a new activity
        const activity = new Activity({
            activityType,
            activityTitle,
            assignedTo,
            notes,
            comments,
            centerId,
            dueDate,
            userId,
            status
        });

        await activity.save();
        res.status(201).json({ activity, success: true });
    } catch (error) {
        console.error('Error adding activity:', error);
        res.status(500).json({ message: 'Failed to add activity', success: false });
    }
};

// Get all activities
export const getActivities = async (req, res) => {
    try {
        const activities = await Activity.find();
        if (!activities) {
            return res.status(404).json({ message: 'No activities found', success: false });
        }
        res.status(200).json({ activities, success: true });
    } catch (error) {
        console.error('Error fetching activities:', error);
        res.status(500).json({ message: 'Failed to fetch activities', success: false });
    }
};

// Get activity by ID
export const getActivityById = async (req, res) => {
    try {
        const { id } = req.params;
        const activity = await Activity.findById(id);
        if (!activity) {
            return res.status(404).json({ message: 'Activity not found', success: false });
        }
        res.status(200).json({ activity, success: true });
    } catch (error) {
        console.error('Error fetching activity:', error);
        res.status(500).json({ message: 'Failed to fetch activity', success: false });
    }
};

// Update activity by ID
export const updateActivity = async (req, res) => {
    try {
        const { id } = req.params;
        const { activityType, activityTitle, assignedTo, notes, comments, centerId, dueDate, userId, status } = req.body;

        // Build updated data
        const updatedData = {
            ...(activityType && { activityType }),
            ...(activityTitle && { activityTitle }),
            ...(assignedTo && { assignedTo }),
            ...(notes && { notes }),
            ...(comments && { comments }),
            ...(centerId && { centerId }),
            ...(dueDate && { dueDate }),
            ...(userId && { userId }),
            ...(status && { status })
        };

        const activity = await Activity.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
        if (!activity) {
            return res.status(404).json({ message: 'Activity not found', success: false });
        }
        res.status(200).json({ activity, success: true });
    } catch (error) {
        console.error('Error updating activity:', error);
        res.status(400).json({ message: 'Failed to update activity', success: false });
    }
};

// Delete activity by ID
export const deleteActivity = async (req, res) => {
    try {
        const { id } = req.params;
        const activity = await Activity.findByIdAndDelete(id);
        if (!activity) {
            return res.status(404).json({ message: 'Activity not found', success: false });
        }
        res.status(200).json({ activity, success: true });
    } catch (error) {
        console.error('Error deleting activity:', error);
        res.status(500).json({ message: 'Failed to delete activity', success: false });
    }
};
