import { Estimate } from '../models/estimate.model.js'; // Update the path as per your project structure

// Add a new estimate
export const addEstimate = async (req, res) => {
    try {
        const { estimatePlan, userId, centerId } = req.body;

        if (!estimatePlan) {
            return res.status(400).json({ message: 'Estimate plan is required', success: false });
        }

        const estimate = new Estimate({ estimatePlan, userId, centerId });
        await estimate.save();

        res.status(201).json({ estimate, success: true });
    } catch (error) {
        console.error('Error adding estimate:', error);
        res.status(500).json({ message: 'Failed to add estimate', success: false });
    }
};

// Get all estimates with pagination
export const getEstimates = async (req, res) => {
    try {
        const estimates = await Estimate.find();
        if (!estimates ) {
            return res.status(404).json({ message: 'No estimates found', success: false });
        }
        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        const startIndex = (page - 1) * limit;
        const paginatedEstimates = estimates.slice(startIndex, startIndex + limit);

        res.status(200).json({ 
            estimates: paginatedEstimates, 
            success: true,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(estimates.length / limit),
                totalEstimates: estimates.length,
            },
        });
    } catch (error) {
        console.error('Error fetching estimates:', error);
        res.status(500).json({ message: 'Failed to fetch estimates', success: false });
    }
};

// Get estimate by ID
export const getEstimateById = async (req, res) => {
    try {
        const { id } = req.params;
        const estimate = await Estimate.findById(id);
        if (!estimate) {
            return res.status(404).json({ message: 'Estimate not found', success: false });
        }
        res.status(200).json({ estimate, success: true });
    } catch (error) {
        console.error('Error fetching estimate:', error);
        res.status(500).json({ message: 'Failed to fetch estimate', success: false });
    }
};

// Update estimate by ID
export const updateEstimate = async (req, res) => {
    try {
        const { id } = req.params;
        const { estimatePlan, userId, centerId } = req.body;

        const updatedData = { ...estimatePlan && { estimatePlan }, ...userId && { userId }, ...centerId && { centerId } };
        const estimate = await Estimate.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });

        if (!estimate) {
            return res.status(404).json({ message: 'Estimate not found', success: false });
        }
        res.status(200).json({ estimate, success: true });
    } catch (error) {
        console.error('Error updating estimate:', error);
        res.status(400).json({ message: 'Failed to update estimate', success: false });
    }
};

// Delete estimate by ID
export const deleteEstimate = async (req, res) => {
    try {
        const { id } = req.params;
        const estimate = await Estimate.findByIdAndDelete(id);
        if (!estimate) {
            return res.status(404).json({ message: 'Estimate not found', success: false });
        }
        res.status(200).json({ estimate, success: true });
    } catch (error) {
        console.error('Error deleting estimate:', error);
        res.status(500).json({ message: 'Failed to delete estimate', success: false });
    }
};

// Dashboard estimates
export const dashboardEstimates = async (req, res) => {
    try {
        const totalEstimates = await Estimate.countDocuments();
        const lastFiveEstimates = await Estimate.find({}, { _id: 1 })
            .sort({ createdAt: -1 })
            .limit(5);

        res.status(200).json({ totalEstimates, estimates: lastFiveEstimates });
    } catch (error) {
        console.error('Error fetching estimates:', error);
        res.status(500).json({ message: 'Failed to fetch estimates', success: false });
    }
};

// Search estimates
export const searchEstimates = async (req, res) => {
    try {
        const { search } = req.query;
        if (!search) {
            return res.status(400).json({ message: 'Search query is required', success: false });
        }

        const regex = new RegExp(search, 'i');
        const estimates = await Estimate.find(); // Modify search fields if necessary

        res.status(200).json({
            estimates,
            success: true,
            pagination: {
                currentPage: 1,
                totalPages: Math.ceil(estimates.length / 12),
                totalEstimates: estimates.length,
            },
        });
    } catch (error) {
        console.error('Error searching estimates:', error);
        res.status(500).json({ message: 'Failed to search estimates', success: false });
    }
};
