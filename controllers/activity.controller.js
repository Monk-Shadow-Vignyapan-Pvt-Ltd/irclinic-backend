import { Activity } from '../models/activity.model.js'; // Update the path as per your project structure
import moment from 'moment';

// Add a new activity
export const addActivity = async (req, res) => {
    try {
        const { activityType, activityTitle, assignedTo, notes, comments, centerId, dueDate,repeat, userId, status } = req.body;

        // Validate required fields
        if (!activityType || !activityTitle || !assignedTo || !notes || !dueDate) {
            return res.status(400).json({ message: 'All required fields must be filled', success: false });
        }

        let repeatedActivities = [];
        const activityCreated = moment().startOf("day");
        const activityDue = moment(dueDate).endOf("day");
        let currentDate = activityCreated.clone();

        if (["Day", "Week", "Month", "Year"].includes(repeat)) {
            while (currentDate.isSameOrBefore(activityDue)) {
                repeatedActivities.push({
                    repeatedDate: currentDate.format("YYYY-MM-DD"),
                    status: status || "Pending",
                });

                switch (repeat) {
                    case "Day":
                        currentDate.add(1, "day");
                        break;
                    case "Week":
                        currentDate.add(1, "week");
                        break;
                    case "Month":
                        currentDate.add(1, "month");
                        break;
                    case "Year":
                        currentDate.add(1, "year");
                        break;
                }
            }
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
            repeat,
            repeatedActivities,
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
        const { id } = req.params; // Center ID
        const { userId, startDate, endDate } = req.query;

        // Validate date inputs
        if (!startDate || !endDate) {
            return res.status(400).json({ message: "Start and End dates are required", success: false });
        }

        const start = moment(startDate).startOf("day");
        const end = moment(endDate).endOf("day");

        // Fetch activities for the given center
        const activities = await Activity.find({ centerId: id });

        // Filter activities assigned to the user & check if start is between createdAt and dueDate
        const filteredActivities = activities.filter(activity => {
            const createdDate = moment(activity.createdAt).startOf("day");
            const dueDate = moment(activity.dueDate).endOf("day");

            // Ensure start date is within activity's created & due date range
            // if (!start.isBetween(createdDate, dueDate, "day", "[]")) {
            //     return false;
            // }

            if (dueDate.isBefore(start) || createdDate.isAfter(end)) {
                return false; // No repeated activities
            }
        

            return activity.assignedTo.some(assignee => assignee.value === "all" || assignee.value === userId);
        });

        // Process repeated activities
        const finalActivities = filteredActivities.map(activity => {
            let validRepeatedActivities = [];

            if (activity.repeatedActivities && activity.repeatedActivities.length > 0) {
                validRepeatedActivities = activity.repeatedActivities.filter(repeat =>
                    moment(repeat.repeatedDate).isBetween(start, end, "day", "[]")
                );
            }

            return {
                ...activity.toObject(),
                repeatedActivities: validRepeatedActivities,
            };
        });

        res.status(200).json({ activities: finalActivities.reverse(), success: true });
    } catch (error) {
        console.error("Error fetching activities:", error);
        res.status(500).json({ message: "Failed to fetch activities", success: false });
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
        const { activityType, activityTitle, assignedTo, notes, comments, centerId, dueDate,repeat, userId, status } = req.body;

        let repeatedActivities = [];
        const activityCreated = moment().startOf("day");
        const activityDue = moment(dueDate).endOf("day");
        let currentDate = activityCreated.clone();

        if (["Day", "Week", "Month", "Year"].includes(repeat)) {
            while (currentDate.isSameOrBefore(activityDue)) {
                repeatedActivities.push({
                    repeatedDate: currentDate.format("YYYY-MM-DD"),
                    status: status || "Pending",
                });

                switch (repeat) {
                    case "Day":
                        currentDate.add(1, "day");
                        break;
                    case "Week":
                        currentDate.add(1, "week");
                        break;
                    case "Month":
                        currentDate.add(1, "month");
                        break;
                    case "Year":
                        currentDate.add(1, "year");
                        break;
                }
            }
        }


        // Build updated data
        const updatedData = {
            ...(activityType && { activityType }),
            ...(activityTitle && { activityTitle }),
            ...(assignedTo && { assignedTo }),
            ...(notes && { notes }),
            ...(comments && { comments }),
            ...(centerId && { centerId }),
            ...(dueDate && { dueDate }),
            ...(repeat && { repeat }),
            repeatedActivities,
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

export const followupActivity = async (req, res) => {
    try {
        const { id } = req.params;
        const { activityType, activityTitle, assignedTo, notes, comments, centerId, dueDate,repeat,repeatedActivities, userId, status } = req.body;

        const updatedData = {
            ...(activityType && { activityType }),
            ...(activityTitle && { activityTitle }),
            ...(assignedTo && { assignedTo }),
            ...(notes && { notes }),
            ...(comments && { comments }),
            ...(centerId && { centerId }),
            ...(dueDate && { dueDate }),
            ...(repeat && { repeat }),
            repeatedActivities,
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
        const { id } = req.params;
        const totalActivities = await Activity.countDocuments({ centerId: id }); // Get total count

        const lastFiveActivities = await Activity.find({ centerId: id }, { activityTitle: 1, _id: 1 }) // Select only activityTitle
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
        const { id } = req.params;
        const { userId, startDate, endDate, search } = req.query;

        if (!search) {
            return res.status(400).json({ message: "Search query is required", success: false });
        }

        const start = startDate ? moment(startDate).startOf("day") : moment().startOf("day");
        const end = endDate ? moment(endDate).endOf("day") : moment().endOf("day");

        const regex = new RegExp(search, "i");
        const searchDate = !isNaN(Date.parse(search)) ? new Date(search) : null;

        const activities = await Activity.find({
            centerId: id,
            //dueDate: { $gte: start.toDate(), $lte: end.toDate() },
            $or: [
                { activityType: regex },
                { activityTitle: regex },
                { notes: regex },
                ...(searchDate !== null
                    ? [{ dueDate: { $gte: searchDate, $lt: new Date(searchDate.getTime() + 86400000) } }]
                    : [])
            ]
        });

        const filteredActivities = activities.filter(activity => {
            const createdDate = moment(activity.createdAt).startOf("day");
            const dueDate = moment(activity.dueDate).endOf("day");

            // Ensure start date is within activity's created & due date range
            // if (!start.isBetween(createdDate, dueDate, "day", "[]")) {
            //     return false;
            // }

            if (dueDate.isBefore(start) || createdDate.isAfter(end)) {
                return false; // No repeated activities
            }
        

            return activity.assignedTo.some(assignee => assignee.value === "all" || assignee.value === userId);
        });

        // Process repeated activities
        const finalActivities = filteredActivities.map(activity => {
            let validRepeatedActivities = [];

            if (activity.repeatedActivities && activity.repeatedActivities.length > 0) {
                validRepeatedActivities = activity.repeatedActivities.filter(repeat =>
                    moment(repeat.repeatedDate).isBetween(start, end, "day", "[]")
                );
            }

            return {
                ...activity.toObject(),
                repeatedActivities: validRepeatedActivities,
            };
        });

        res.status(200).json({
            activities: finalActivities.reverse(),
            success: true
        });

    } catch (error) {
        console.error("Error searching activities:", error);
        res.status(500).json({ message: "Failed to search activities", success: false });
    }
};