import { Center } from '../models/center.model.js'; // Update the path as per your project structure

// Add a new center
export const addCenter = async (req, res) => {
    try {
        const { centerName, adminPhoneNo, accountPhoneNo, centerEmail, centerAddress, centerTiming, centerOpenOn, stateCode, cityCode, centerCode, userId, centerImage, centerMapUrl, centerSeoUrl, seoTitle, seoDescription } = req.body;

        // Validate required fields
        if (!centerName || !adminPhoneNo || !accountPhoneNo || !centerEmail || !centerAddress || !stateCode || !cityCode || !centerCode || !centerSeoUrl) {
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
            centerTiming,
            centerOpenOn,
            stateCode,
            cityCode,
            centerCode: upperCaseCenterCode,
            userId, centerImage, centerMapUrl, centerSeoUrl, seoTitle, seoDescription
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
        if (!centers) {
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
        return res.status(200).json({
            centers: paginatedcenters,
            success: true,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(centers.length / limit),
                totalcenters: centers.length,
            },
        });
    } catch (error) {
        console.error('Error fetching centers:', error);
        res.status(500).json({ message: 'Failed to fetch centers', success: false });
    }
};

export const getAllCenters = async (req, res) => {
    try {
        const centers = await Center.find().select('-centerImage');
        if (!centers) {
            return res.status(404).json({ message: "No centers found", success: false });
        }
        return res.status(200).json({
            centers: centers,
            success: true,
        });
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

export const getCenterByUrl = async (req, res) => {
    try {
        const centerSeoUrl = req.params.id;
        const center = await Center.findOne({ centerSeoUrl }); // Populating category data
        if (!center) return res.status(404).json({ message: "Center not found!", success: false });
        return res.status(200).json({ center, success: true });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Failed to fetch center', success: false });
    }
};

// Update center by ID
export const updateCenter = async (req, res) => {
    try {
        const { id } = req.params;
        const { centerName, adminPhoneNo, accountPhoneNo, centerEmail, centerAddress, centerTiming, centerOpenOn, stateCode, cityCode, centerCode, userId, centerImage, centerMapUrl, centerSeoUrl, seoTitle, seoDescription } = req.body;

        const upperCaseCenterCode = centerCode.toUpperCase();

        const existingCenter = await Center.findById(id);
        if (!existingCenter) {
            return res.status(404).json({ message: "Center not found!", success: false });
        }

        // Initialize oldUrls array and add the previous serviceUrl if it's different
        let oldUrls = existingCenter.oldUrls || [];
        if (existingCenter.centerSeoUrl && existingCenter.centerSeoUrl !== centerSeoUrl && !oldUrls.includes(existingCenter.centerSeoUrl)) {
            oldUrls.push(existingCenter.centerSeoUrl);
        }

        // Build updated data
        const updatedData = {
            ...(centerName && { centerName }),
            ...(adminPhoneNo && { adminPhoneNo }),
            ...(accountPhoneNo && { accountPhoneNo }),
            ...(centerEmail && { centerEmail }),
            ...(centerAddress && { centerAddress }),
            centerTiming, centerOpenOn,
            ...(stateCode && { stateCode }),
            ...(cityCode && { cityCode }),
            ...(upperCaseCenterCode && { centerCode: upperCaseCenterCode }),
            ...(userId && { userId }), centerImage, centerMapUrl, centerSeoUrl, oldUrls, seoTitle, seoDescription
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

export const dashboardCenters = async (req, res) => {
    try {
        const totalCenters = await Center.countDocuments(); // Get total count

        const lastFiveCenters = await Center.find({}, { centerName: 1, _id: 1 }) // Select only centerName
            .sort({ createdAt: -1 }) // Sort by creation date (descending)
            .limit(5); // Get last 5 centers

        return res.status(200).json({
            totalCenters,
            centers: lastFiveCenters
        });
    } catch (error) {
        console.error('Error fetching centers:', error);
        res.status(500).json({ message: 'Failed to fetch centers', success: false });
    }
};

export const searchCenters = async (req, res) => {
    try {
        const { search } = req.query;
        if (!search) {
            return res.status(400).json({ message: 'Search query is required', success: false });
        }

        const regex = new RegExp(search, 'i'); // Case-insensitive search

        const centers = await Center.find({
            $or: [
                { centerName: regex },
                { centerEmail: regex },
                { centerAddress: regex },
                { adminPhoneNo: regex },
                { accountPhoneNo: regex },
                { cityCode: regex },
                { stateCode: regex },
                { centerCode: regex }
            ]
        });

        if (!centers) {
            return res.status(404).json({ message: 'No centers found', success: false });
        }

        return res.status(200).json({
            centers: centers,
            success: true,
            pagination: {
                currentPage: 1,
                totalPages: Math.ceil(centers.length / 12),
                totalCenters: centers.length,
            },
        });
    } catch (error) {
        console.error('Error searching centers:', error);
        res.status(500).json({ message: 'Failed to search centers', success: false });
    }
};

export const getCenterSeoUrls = async (req, res) => {
    try {
        const centers = await Center.find().select("centerSeoUrl")

        res.status(200).json({
            centers,
            success: true,
        });
    } catch (error) {
        console.error("Error fetching Centers:", error);
        res
            .status(500)
            .json({ message: "Failed to fetch Centers", success: false });
    }
};

export const getCenterImage = async (req, res) => {
    try {
        const centerId = req.params.id;
        const center = await Center.findById(centerId).select('centerImage');
        if (!center) return res.status(404).json({ message: "center not found!", success: false });
        const matches = center.centerImage.match(/^data:(.+);base64,(.+)$/);
        if (!matches) {
            return res.status(400).send('Invalid image format');
        }

        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');

        res.set('Content-Type', mimeType);
        res.send(buffer);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Failed to fetch center image', success: false });
    }
};