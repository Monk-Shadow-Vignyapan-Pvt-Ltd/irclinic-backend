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
        const reversedactivities = activities.reverse();
        const page = parseInt(req.query.page) || 1;

        // Define the number of items per page
        const limit = 12;

        // Calculate the start and end indices for pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        // Paginate the reversed movies array
        const paginatedactivities = reversedactivities.slice(startIndex, endIndex);
        res.status(200).json({ activities:paginatedactivities, 
            success: true ,
            pagination: {
            currentPage: page,
            totalPages: Math.ceil(activities.length / limit),
            totalActivities: activities.length,} });
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

export const dashboardActivities = async (req, res) => {
    try {
        const totalActivities = await Activity.countDocuments(); // Get total count

        const lastFiveActivities = await Activity.find({}, { activityTitle: 1, _id: 1 }) // Select only activityTitle
            .sort({ createdAt: -1 }) // Sort by creation date (descending)
            .limit(5); // Get last 5 activities

        return res.status(200).json({ 
            totalActivities, 
            activities: lastFiveActivities 
        });
    } catch (error) {
        console.error('Error fetching activities:', error);
        res.status(500).json({ message: 'Failed to fetch activities', success: false });
    }
};


export const searchActivities = async (req, res) => {
    try {
        const { search } = req.query;
        if (!search) {
            return res.status(400).json({ message: 'Search query is required', success: false });
        }

        const regex = new RegExp(search, 'i'); // Case-insensitive search

        const activities = await Activity.find({
            $or: [
                { activityType: regex },
                { activityTitle: regex },
                { notes: regex },
                { dueDate: regex },
            ]
        });

        if (!activities) {
            return res.status(404).json({ message: 'No activities found', success: false });
        }

        return res.status(200).json({
            activities: activities,
            success: true,
            pagination: {
                currentPage: 1,
                totalPages: Math.ceil(activities.length / 12),
                totalActivities: activities.length,
            },
        });
    } catch (error) {
        console.error('Error searching activities:', error);
        res.status(500).json({ message: 'Failed to search activities', success: false });
    }
};