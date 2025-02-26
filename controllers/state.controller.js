import { State } from '../models/state.model.js'; // Update the path as per your project structure

// Add a new state
export const addState = async (req, res) => {
    try {
        const { stateName,stateCode, userId,centerId } = req.body;

        // Validate required fields
        if (!stateName || !stateCode) {
            return res.status(400).json({ message: 'All Field is required', success: false });
        }

        const upperCaseStateCode = stateCode.toUpperCase();

        // Create a new state
        const state = new State({ stateName,stateCode:upperCaseStateCode, userId,centerId });

        await state.save();
        res.status(201).json({ state, success: true });
    } catch (error) {
        console.error('Error adding state:', error);
        res.status(500).json({ message: 'Failed to add state', success: false });
    }
};

// Get all states
export const getStates = async (req, res) => {
    try {
        const states = await State.find();
        if (!states ) {
            return res.status(404).json({ message: 'No states found', success: false });
        }
        const reversedstates = states.reverse();
        const page = parseInt(req.query.page) || 1;

        // Define the number of items per page
        const limit = 12;

        // Calculate the start and end indices for pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        // Paginate the reversed movies array
        const paginatedstates = reversedstates.slice(startIndex, endIndex);
        return res.status(200).json({ 
            states:paginatedstates, 
            success: true ,
            pagination: {
            currentPage: page,
            totalPages: Math.ceil(states.length / limit),
            totalstates: states.length,
        },});
    } catch (error) {
        console.error('Error fetching states:', error);
        res.status(500).json({ message: 'Failed to fetch states', success: false });
    }
};

export const getAllStates = async (req, res) => {
    try {
        const states = await State.find();
        if (!states ) {
            return res.status(404).json({ message: 'No states found', success: false });
        }
        
        return res.status(200).json({ 
            states:states, 
            success: true ,
            });
    } catch (error) {
        console.error('Error fetching states:', error);
        res.status(500).json({ message: 'Failed to fetch states', success: false });
    }
};

// Get state by ID
export const getStateById = async (req, res) => {
    try {
        const { id } = req.params;
        const state = await State.findById(id);
        if (!state) {
            return res.status(404).json({ message: 'State not found', success: false });
        }
        res.status(200).json({ state, success: true });
    } catch (error) {
        console.error('Error fetching state:', error);
        res.status(500).json({ message: 'Failed to fetch state', success: false });
    }
};

// Update state by ID
export const updateState = async (req, res) => {
    try {
        const { id } = req.params;
        const { stateName,stateCode, userId,centerId } = req.body;

        // Build updated data

        const upperCaseStateCode = stateCode.toUpperCase();
        const updatedData = {
            ...(stateName && { stateName }),
            ...(upperCaseStateCode && { stateCode:upperCaseStateCode }),
            ...(userId && { userId }),
            centerId
        };

        const state = await State.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
        if (!state) {
            return res.status(404).json({ message: 'State not found', success: false });
        }
        res.status(200).json({ state, success: true });
    } catch (error) {
        console.error('Error updating state:', error);
        res.status(400).json({ message: 'Failed to update state', success: false });
    }
};

// Delete state by ID
export const deleteState = async (req, res) => {
    try {
        const { id } = req.params;
        const state = await State.findByIdAndDelete(id);
        if (!state) {
            return res.status(404).json({ message: 'State not found', success: false });
        }
        res.status(200).json({ state, success: true });
    } catch (error) {
        console.error('Error deleting state:', error);
        res.status(500).json({ message: 'Failed to delete state', success: false });
    }
};

export const dashboardStates = async (req, res) => {
    try {
        const totalStates = await State.countDocuments(); // Get total count

        const lastFiveStates = await State.find({}, { stateName: 1, _id: 1 }) // Select only stateName
            .sort({ createdAt: -1 }) // Sort by creation date (descending)
            .limit(5); // Get last 5 States

        return res.status(200).json({ 
            totalStates, 
            states: lastFiveStates 
        });
    } catch (error) {
        console.error('Error fetching States:', error);
        res.status(500).json({ message: 'Failed to fetch States', success: false });
    }
};

export const searchStates = async (req, res) => {
    try {
        const { search } = req.query;
        if (!search) {
            return res.status(400).json({ message: 'Search query is required', success: false });
        }

        const regex = new RegExp(search, 'i'); // Case-insensitive search

        const states = await State.find({
            $or: [
                { stateName: regex },
                { stateCode: regex }
            ]
        });

        if (!states) {
            return res.status(404).json({ message: 'No states found', success: false });
        }

        return res.status(200).json({
            states: states,
            success: true,
            pagination: {
                currentPage: 1,
                totalPages: Math.ceil(states.length / 12),
                totalStates: states.length,
            },
        });
    } catch (error) {
        console.error('Error searching states:', error);
        res.status(500).json({ message: 'Failed to search states', success: false });
    }
};
