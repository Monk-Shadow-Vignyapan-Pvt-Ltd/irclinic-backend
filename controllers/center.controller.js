import { Center } from '../models/center.model.js'; // Update the path as per your project structure

// Add a new center
export const addCenter = async (req, res) => {
    try {
        const { centerName, adminPhoneNo, accountPhoneNo, centerEmail, centerAddress, stateCode, cityCode,centerCode, userId } = req.body;

        // Validate required fields
        if (!centerName || !adminPhoneNo || !accountPhoneNo || !centerEmail || !centerAddress || !stateCode || !cityCode || !centerCode) {
            return res.status(400).json({ message: 'All fields are required', success: false });
        }

        const upperCaseCenterCode = centerCode.toUpperCase();

        // Create a new center
        const center = new Center({
            centerName,
            adminPhoneNo,
            accountPhoneNo,
            centerEmail,
            centerAddress,
            stateCode,
            cityCode,
            centerCode:upperCaseCenterCode,
            userId
        });

        await center.save();
        res.status(201).json({ center, success: true });
    } catch (error) {
        console.error('Error adding center:', error);
        res.status(500).json({ message: 'Failed to add center', success: false });
    }
};

// Get all centers
export const getCenters = async (req, res) => {
    try {
        const centers = await Center.find();
        if (!centers ) {
            return res.status(404).json({ message: "No centers found", success: false });
        }
        const reversedcenters = centers.reverse();
        const page = parseInt(req.query.page) || 1;

        // Define the number of items per page
        const limit = 12;

        // Calculate the start and end indices for pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        // Paginate the reversed movies array
        const paginatedcenters = reversedcenters.slice(startIndex, endIndex);
        return res.status(200).json({centers:paginatedcenters, 
            success: true ,
            pagination: {
            currentPage: page,
            totalPages: Math.ceil(centers.length / limit),
            totalcenters: centers.length,
        }, });
    } catch (error) {
        console.error('Error fetching centers:', error);
        res.status(500).json({ message: 'Failed to fetch centers', success: false });
    }
};

// Get center by ID
export const getCenterById = async (req, res) => {
    try {
        const { id } = req.params;
        const center = await Center.findById(id);
        if (!center) {
            return res.status(404).json({ message: "Center not found", success: false });
        }
        return res.status(200).json({ center, success: true });
    } catch (error) {
        console.error('Error fetching center:', error);
        res.status(500).json({ message: 'Failed to fetch center', success: false });
    }
};

// Update center by ID
export const updateCenter = async (req, res) => {
    try {
        const { id } = req.params;
        const {  centerName, adminPhoneNo, accountPhoneNo, centerEmail, centerAddress, stateCode, cityCode,centerCode, userId } = req.body;

        const upperCaseCenterCode = centerCode.toUpperCase();

        // Build updated data
        const updatedData = {
            ...(centerName && { centerName }),
            ...(adminPhoneNo && { adminPhoneNo }),
            ...(accountPhoneNo && { accountPhoneNo }),
            ...(centerEmail && { centerEmail }),
            ...(centerAddress && { centerAddress }),
            ...(stateCode && { stateCode }),
            ...(cityCode && { cityCode }),
            ...(upperCaseCenterCode && { centerCode:upperCaseCenterCode }),
            ...(userId && { userId })
        };

        const center = await Center.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
        if (!center) {
            return res.status(404).json({ message: "Center not found", success: false });
        }
        return res.status(200).json({ center, success: true });
    } catch (error) {
        console.error('Error updating center:', error);
        res.status(400).json({ message: 'Failed to update center', success: false });
    }
};

// Delete center by ID
export const deleteCenter = async (req, res) => {
    try {
        const { id } = req.params;
        const center = await Center.findByIdAndDelete(id);
        if (!center) {
            return res.status(404).json({ message: "Center not found", success: false });
        }
        return res.status(200).json({ center, success: true });
    } catch (error) {
        console.error('Error deleting center:', error);
        res.status(500).json({ message: 'Failed to delete center', success: false });
    }
};
