import { Procedure } from '../models/procedure.model.js'; // Update the path as per your project structure

// Add a new procedure
export const addProcedure = async (req, res) => {
    try {
        const { procedureName, cost, gst, notes, instructions,isProcedure, userId } = req.body;

        // Validate required fields
        if (!procedureName || cost === undefined || gst === undefined) {
            return res.status(400).json({ message: 'Procedure name, cost, and GST are required', success: false });
        }

        // Create a new procedure
        const procedure = new Procedure({
            procedureName,
            cost,
            gst,
            notes,
            instructions,
            isProcedure,
            userId
        });

        await procedure.save();
        res.status(201).json({ procedure, success: true });
    } catch (error) {
        console.error('Error adding procedure:', error);
        res.status(500).json({ message: 'Failed to add procedure', success: false });
    }
};

// Get all procedures
export const getProcedures = async (req, res) => {
    try {
        const procedures = await Procedure.find();
        if (!procedures ) {
            return res.status(404).json({ message: "No procedures found", success: false });
        }
        const reversedprocedures = procedures.reverse();
        const page = parseInt(req.query.page) || 1;

        // Define the number of items per page
        const limit = 12;

        // Calculate the start and end indices for pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        // Paginate the reversed movies array
        const paginatedprocedures = reversedprocedures.slice(startIndex, endIndex);
        return res.status(200).json({ 
            procedures:paginatedprocedures, 
            success: true ,
            pagination: {
            currentPage: page,
            totalPages: Math.ceil(procedures.length / limit),
            totalprocedures: procedures.length,
        },});
    } catch (error) {
        console.error('Error fetching procedures:', error);
        res.status(500).json({ message: 'Failed to fetch procedures', success: false });
    }
};

// Get procedure by ID
export const getProcedureById = async (req, res) => {
    try {
        const { id } = req.params;
        const procedure = await Procedure.findById(id);
        if (!procedure) {
            return res.status(404).json({ message: "Procedure not found", success: false });
        }
        return res.status(200).json({ procedure, success: true });
    } catch (error) {
        console.error('Error fetching procedure:', error);
        res.status(500).json({ message: 'Failed to fetch procedure', success: false });
    }
};

// Update procedure by ID
export const updateProcedure = async (req, res) => {
    try {
        const { id } = req.params;
        const { procedureName, cost, gst, notes, instructions,isProcedure, userId } = req.body;

        // Build updated data
        const updatedData = {
            ...(procedureName && { procedureName }),
            ...(cost !== undefined && { cost }),
            ...(gst !== undefined && { gst }),
            ...(notes && { notes }),
            ...(instructions && { instructions }),
            isProcedure ,
            ...(userId && { userId })
        };

        const procedure = await Procedure.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
        if (!procedure) {
            return res.status(404).json({ message: "Procedure not found", success: false });
        }
        return res.status(200).json({ procedure, success: true });
    } catch (error) {
        console.error('Error updating procedure:', error);
        res.status(400).json({ message: 'Failed to update procedure', success: false });
    }
};

// Delete procedure by ID
export const deleteProcedure = async (req, res) => {
    try {
        const { id } = req.params;
        const procedure = await Procedure.findByIdAndDelete(id);
        if (!procedure) {
            return res.status(404).json({ message: "Procedure not found", success: false });
        }
        return res.status(200).json({ procedure, success: true });
    } catch (error) {
        console.error('Error deleting procedure:', error);
        res.status(500).json({ message: 'Failed to delete procedure', success: false });
    }
};

export const dashboardProcedures = async (req, res) => {
    try {
        const totalProcedures = await Procedure.countDocuments(); // Get total count

        const lastFiveProcedures = await Procedure.find({}, { procedureName: 1, _id: 1 }) // Select only ProcedureName
            .sort({ createdAt: -1 }) // Sort by creation date (descending)
            .limit(5); // Get last 5 Procedures

        return res.status(200).json({ 
            totalProcedures, 
            procedures: lastFiveProcedures 
        });
    } catch (error) {
        console.error('Error fetching Procedures:', error);
        res.status(500).json({ message: 'Failed to fetch Procedures', success: false });
    }
};

export const searchProcedures = async (req, res) => {
    try {
        const { search } = req.query;
        if (!search) {
            return res.status(400).json({ message: 'Search query is required', success: false });
        }

        const regex = new RegExp(search, 'i'); // Case-insensitive search

        const procedures = await Procedure.find({
            $or: [
                { procedureName: regex },
                { cost: regex },
                { gst: regex },
                { notes: regex },
            ]
        });

        if (!procedures) {
            return res.status(404).json({ message: 'No procedures found', success: false });
        }

        return res.status(200).json({
            procedures: procedures,
            success: true,
            pagination: {
                currentPage: 1,
                totalPages: Math.ceil(procedures.length / 12),
                totalProcedures: procedures.length,
            },
        });
    } catch (error) {
        console.error('Error searching procedures:', error);
        res.status(500).json({ message: 'Failed to search procedures', success: false });
    }
};
