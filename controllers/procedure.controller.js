import { Procedure } from '../models/procedure.model.js'; // Update the path as per your project structure

// Add a new procedure
export const addProcedure = async (req, res) => {
    try {
        const { procedureName, cost, notes, instructions,isProcedure,procedureUrl, userId,centerId } = req.body;

        // Validate required fields
        if (!procedureName || cost === undefined ) {
            return res.status(400).json({ message: 'Procedure name and cost are required', success: false });
        }

        // Create a new procedure
        const procedure = new Procedure({
            procedureName,
            cost,
            notes,
            instructions,
            isProcedure,
            userId,
            procedureUrl,
            centerId
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
        const { id } = req.params;
        const procedures = await Procedure.find({
            'centerId.value': { $in: ['all', id] }
          });
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

export const getProceduresFrontend = async (req, res) => {
    try {
        const { id } = req.params;
        const procedures = await Procedure.find({
            'centerId.value': { $in: [ id] }
          }).select('procedureName, cost, notes, instructions, isProcedure, procedureUrl, userId, centerId')
        .populate('procedureId'); // Populating category data
        if (!procedures) return res.status(404).json({ message: "Procedures not found", success: false });
        return res.status(200).json({ procedures });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Failed to fetch procedures', success: false });
    }
};

export const getAllProcedures = async (req, res) => {
    try {
        const { id } = req.params;
        const procedures = await Procedure.find({
            'centerId.value': { $in: ['all', id] }
          });
        if (!procedures ) {
            return res.status(404).json({ message: "No procedures found", success: false });
        }
        return res.status(200).json({ 
            procedures, 
            success: true ,
            });
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
        const { procedureName, cost, notes, instructions,isProcedure, userId,procedureUrl,centerId } = req.body;

        // Build updated data
        const updatedData = {
            ...(procedureName && { procedureName }),
            ...(cost !== undefined && { cost }),
            ...(notes && { notes }),
            ...(instructions && { instructions }),
            isProcedure ,
            ...(userId && { userId }),
            procedureUrl,
            centerId
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
        const { id } = req.params;
        const totalProcedures = await Procedure.countDocuments({
            'centerId.value': { $in: ['all', id] }
          }); // Get total count

        const lastFiveProcedures = await Procedure.find({
            'centerId.value': { $in: ['all', id] }
          }, { procedureName: 1, _id: 1 }) // Select only ProcedureName
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
        const { id } = req.params;
        const { search } = req.query;
        if (!search) {
            return res.status(400).json({ message: 'Search query is required', success: false });
        }

        const regex = new RegExp(search, 'i'); // Case-insensitive search
        const searchNumber = !isNaN(search) ? Number(search) : null; 

        const procedures = await Procedure.find({
            
                'centerId.value': { $in: ['all', id] }
              ,
            $or: [
                { procedureName: regex },
                { notes: regex },
                ...(searchNumber !== null ? [{ cost: searchNumber }] : [])
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
