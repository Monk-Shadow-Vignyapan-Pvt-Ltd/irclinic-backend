import { Activity } from '../models/activity.model.js'; // Update the path as per your project structure
import moment from 'moment';
import dotenv from "dotenv";
import { FirebaseToken } from '../models/firebaseToken.model.js';
import { User } from '../models/user.model.js';
import mongoose from "mongoose";
import { io } from "../index.js";
import admin from "firebase-admin";

dotenv.config();

const firebaseConfig = JSON.parse(Buffer.from(process.env.FIREBASE_CREDENTIALS, "base64").toString("utf8"));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig),
    });
}

// Add a new activity
export const addActivity = async (req, res) => {
    try {
        const { activityType, activityTitle, assignedTo, notes, comments, centerId,startDate, dueDate,repeat, userId, status } = req.body;

        // Validate required fields
        if (!activityType || !activityTitle || !assignedTo || !notes || !startDate || !dueDate) {
            return res.status(400).json({ message: 'All required fields must be filled', success: false });
        }

        let repeatedActivities = [];
        const activityCreated = moment(startDate).startOf("day");
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
            startDate,
            dueDate,
            repeat,
            repeatedActivities,
            userId,
            status
        });

        await activity.save();
        const firebasetokens = await FirebaseToken.find();
        const users = await User.find( {role: { $ne: 'Vendor' },centerId: new mongoose.Types.ObjectId(centerId),});
        const assignedIds = assignedTo.map(u => u.value); 
        const filteredUsers = assignedIds.includes("all")
            ? users
            : users.filter(user => assignedIds.includes(user._id.toString()));

        const filterTokens = firebasetokens.filter(token =>
            filteredUsers.some(user => user._id.toString() === token.userId.toString())
        );

        const tokens = [
            ...new Set(
              filterTokens
                .filter(token => token.centerId.toString() === centerId.toString())
                .flatMap(user => [user.webToken, user.mobileToken])  // Include both tokens
                .filter(token => token)  // Remove undefined or null values
            )
          ];


        const notificationMessage = {
            title: `New Activity Created For You`,
            body: `An activity with ${activityTitle} is scheduled on ${new Date(startDate).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}.`,
            type: "Activity",
            date: new Date(),
            activityId: activity._id,
            isView:false,
            link:"/activity"
        };

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        

        // Store notifications in each matched user
        await User.updateMany(
            {
              _id: { $in: filteredUsers.map(user => user._id) },
              $or: [
                { centerId: new mongoose.Types.ObjectId(centerId) },
                { centerId: centerId.toString() }
              ]
            },
            [
              {
                $set: {
                  notifications: {
                    $filter: {
                      input: { $ifNull: ["$notifications", []] }, // ensures it's always an array
                      as: "notif",
                      cond: { $gte: [{ $toDate: "$$notif.date" }, sevenDaysAgo] }
                    }
                  }
                }
              }
            ]
          );
          
        
                                await User.updateMany(
                                    { 
                                        _id: { $in: filteredUsers.map(user => user._id) },
                                        $or: [
                                            { centerId: new mongoose.Types.ObjectId(centerId) }, // Match ObjectId
                                            { centerId: centerId.toString() } // Match string version
                                        ]
                                    },
                                    { 
                                        $push: { notifications: notificationMessage },
                                    }
                                );

                                io.emit("notification",  { success: true }  );

        // Send Firebase Notification
        if (tokens.length > 0) {
            const message = {
                notification: {
                    title: notificationMessage.title,
                    body: notificationMessage.body
                },
                data: { // ✅ Add URL inside "data"
                    url: "https://console.interventionalradiology.co.in"
                },
                tokens: tokens, // Use tokens array for multicast
            };

            admin.messaging().sendEachForMulticast(message)
                .then(response => {
                    response.responses.forEach((resp, index) => {
                        if (!resp.success) {
                            console.error(`Error sending to token ${tokens[index]}:`, resp.error);
                        }
                    });
                })
                .catch(error => {
                    console.error("Firebase Messaging Error:", error);
                });
        }
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
            const createdDate = moment(activity.startDate).startOf("day");
            const dueDate = moment(activity.dueDate).endOf("day");

            // Ensure start date is within activity's created & due date range
            // if (!start.isBetween(createdDate, dueDate, "day", "[]")) {
            //     return false;
            // }

            if ( dueDate.isBefore(start) ||  createdDate.isAfter(end)) {
                return false; // No repeated activities
            }
             
            return   (activity.userId && activity.userId.toString() === userId) || activity.assignedTo.some(assignee => assignee.value === "all" || assignee.value === userId)  ;
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
        const { activityType, activityTitle, assignedTo, notes, comments, centerId,startDate, dueDate,repeat, userId, status } = req.body;

        let repeatedActivities = [];
        const activityCreated = moment(startDate).startOf("day");
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
            ...(startDate && { startDate }),
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
        const firebasetokens = await FirebaseToken.find();
        const users = await User.find( {role: { $ne: 'Vendor' },centerId: new mongoose.Types.ObjectId(centerId),});
        const assignedIds = assignedTo.map(u => u.value); 
        const filteredUsers = assignedIds.includes("all")
            ? users
            : users.filter(user => assignedIds.includes(user._id.toString()));

        const filterTokens = firebasetokens.filter(token =>
            filteredUsers.some(user => user._id.toString() === token.userId.toString())
        );

        const tokens = [
            ...new Set(
              filterTokens
                .filter(token => token.centerId.toString() === centerId.toString())
                .flatMap(user => [user.webToken, user.mobileToken])  // Include both tokens
                .filter(token => token)  // Remove undefined or null values
            )
          ];


        const notificationMessage = {
            title: `New Activity Created For You`,
            body: `An activity with ${activityTitle} is scheduled on ${new Date(startDate).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}.`,
            type: "Activity",
            date: new Date(),
            activityId: activity._id,
            isView:false,
            link:"/activity"
        };

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        

        // Store notifications in each matched user
        await User.updateMany(
            {
              _id: { $in: filteredUsers.map(user => user._id) },
              $or: [
                { centerId: new mongoose.Types.ObjectId(centerId) },
                { centerId: centerId.toString() }
              ]
            },
            [
              {
                $set: {
                  notifications: {
                    $filter: {
                      input: { $ifNull: ["$notifications", []] }, // ensures it's always an array
                      as: "notif",
                      cond: { $gte: [{ $toDate: "$$notif.date" }, sevenDaysAgo] }
                    }
                  }
                }
              }
            ]
          );
          
        
                                await User.updateMany(
                                    { 
                                        _id: { $in: filteredUsers.map(user => user._id) },
                                        $or: [
                                            { centerId: new mongoose.Types.ObjectId(centerId) }, // Match ObjectId
                                            { centerId: centerId.toString() } // Match string version
                                        ]
                                    },
                                    { 
                                        $push: { notifications: notificationMessage },
                                    }
                                );

                                io.emit("notification",  { success: true }  );

        // Send Firebase Notification
        if (tokens.length > 0) {
            const message = {
                notification: {
                    title: notificationMessage.title,
                    body: notificationMessage.body
                },
                data: { // ✅ Add URL inside "data"
                    url: "https://console.interventionalradiology.co.in"
                },
                tokens: tokens, // Use tokens array for multicast
            };

            admin.messaging().sendEachForMulticast(message)
                .then(response => {
                    response.responses.forEach((resp, index) => {
                        if (!resp.success) {
                            console.error(`Error sending to token ${tokens[index]}:`, resp.error);
                        }
                    });
                })
                .catch(error => {
                    console.error("Firebase Messaging Error:", error);
                });
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
        const { activityType, activityTitle, assignedTo, notes, comments, centerId,startDate, dueDate,repeat,repeatedActivities, userId, status } = req.body;

        const updatedData = {
            ...(activityType && { activityType }),
            ...(activityTitle && { activityTitle }),
            ...(assignedTo && { assignedTo }),
            ...(notes && { notes }),
            ...(comments && { comments }),
            ...(centerId && { centerId }),
            ...(startDate && { startDate }),
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
        const firebasetokens = await FirebaseToken.find();
        const users = await User.find( {role: { $ne: 'Vendor' },centerId: new mongoose.Types.ObjectId(centerId),});
        const assignedIds = assignedTo.map(u => u.value); 
        const filteredUsers = assignedIds.includes("all")
            ? users
            : users.filter(user => assignedIds.includes(user._id.toString()));

        const filterTokens = firebasetokens.filter(token =>
            filteredUsers.some(user => user._id.toString() === token.userId.toString())
        );

        const tokens = [
            ...new Set(
              filterTokens
                .filter(token => token.centerId.toString() === centerId.toString())
                .flatMap(user => [user.webToken, user.mobileToken])  // Include both tokens
                .filter(token => token)  // Remove undefined or null values
            )
          ];


        const notificationMessage = {
            title: `New Activity Created For You`,
            body: `An activity with ${activityTitle} is scheduled on ${new Date(startDate).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}.`,
            type: "Activity",
            date: new Date(),
            activityId: activity._id,
            isView:false,
            link:"/activity"
        };

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        

        // Store notifications in each matched user
        await User.updateMany(
            {
              _id: { $in: filteredUsers.map(user => user._id) },
              $or: [
                { centerId: new mongoose.Types.ObjectId(centerId) },
                { centerId: centerId.toString() }
              ]
            },
            [
              {
                $set: {
                  notifications: {
                    $filter: {
                      input: { $ifNull: ["$notifications", []] }, // ensures it's always an array
                      as: "notif",
                      cond: { $gte: [{ $toDate: "$$notif.date" }, sevenDaysAgo] }
                    }
                  }
                }
              }
            ]
          );
          
        
                                await User.updateMany(
                                    { 
                                        _id: { $in: filteredUsers.map(user => user._id) },
                                        $or: [
                                            { centerId: new mongoose.Types.ObjectId(centerId) }, // Match ObjectId
                                            { centerId: centerId.toString() } // Match string version
                                        ]
                                    },
                                    { 
                                        $push: { notifications: notificationMessage },
                                    }
                                );

                                io.emit("notification",  { success: true }  );

        // Send Firebase Notification
        if (tokens.length > 0) {
            const message = {
                notification: {
                    title: notificationMessage.title,
                    body: notificationMessage.body
                },
                data: { // ✅ Add URL inside "data"
                    url: "https://console.interventionalradiology.co.in"
                },
                tokens: tokens, // Use tokens array for multicast
            };

            admin.messaging().sendEachForMulticast(message)
                .then(response => {
                    response.responses.forEach((resp, index) => {
                        if (!resp.success) {
                            console.error(`Error sending to token ${tokens[index]}:`, resp.error);
                        }
                    });
                })
                .catch(error => {
                    console.error("Firebase Messaging Error:", error);
                });
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