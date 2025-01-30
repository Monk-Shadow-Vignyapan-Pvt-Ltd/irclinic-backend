import { Hospital } from '../models/hospital.model.js'; // Update the path as per your project structure

// Add a new hospital
export const addHospital = async (req, res) => {
    try {
        const { hospitalName, adminPhoneNo, accountPhoneNo, hospitalEmail, hospitalAddress, state, city, userId } = req.body;

        // Validate required fields
        if (!hospitalName || !adminPhoneNo || !accountPhoneNo || !hospitalEmail || !hospitalAddress || !state || !city) {
            return res.status(400).json({ message: 'All fields are required', success: false });
        }

        // Create a new hospital
        const hospital = new Hospital({
            hospitalName,
            adminPhoneNo,
            accountPhoneNo,
            hospitalEmail,
            hospitalAddress,
            state,
            city,
            userId
        });

        await hospital.save();
        res.status(201).json({ hospital, success: true });
    } catch (error) {
        console.error('Error adding hospital:', error);
        res.status(500).json({ message: 'Failed to add hospital', success: false });
    }
};

// Get all hospitals
export const getHospitals = async (req, res) => {
    try {
        const hospitals = await Hospital.find();
        if (!hospitals ) {
            return res.status(404).json({ message: "No hospitals found", success: false });
        }
        const reversedHospitals = hospitals.reverse();
        const page = parseInt(req.query.page) || 1;

        // Define the number of items per page
        const limit = 12;

        // Calculate the start and end indices for pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        // Paginate the reversed movies array
        const paginatedHospitals = reversedHospitals.slice(startIndex, endIndex);
        return res.status(200).json({ 
            hospitals:paginatedHospitals, 
            success: true ,
            pagination: {
            currentPage: page,
            totalPages: Math.ceil(hospitals.length / limit),
            totalHospitals: hospitals.length,
        },});
    } catch (error) {
        console.error('Error fetching hospitals:', error);
        res.status(500).json({ message: 'Failed to fetch hospitals', success: false });
    }
};

// Get hospital by ID
export const getHospitalById = async (req, res) => {
    try {
        const { id } = req.params;
        const hospital = await Hospital.findById(id);
        if (!hospital) {
            return res.status(404).json({ message: "Hospital not found", success: false });
        }
        return res.status(200).json({ hospital, success: true });
    } catch (error) {
        console.error('Error fetching hospital:', error);
        res.status(500).json({ message: 'Failed to fetch hospital', success: false });
    }
};

// Update hospital by ID
export const updateHospital = async (req, res) => {
    try {
        const { id } = req.params;
        const { hospitalName, adminPhoneNo, accountPhoneNo, hospitalEmail, hospitalAddress, state, city, userId } = req.body;

        // Build updated data
        const updatedData = {
            ...(hospitalName && { hospitalName }),
            ...(adminPhoneNo && { adminPhoneNo }),
            ...(accountPhoneNo && { accountPhoneNo }),
            ...(hospitalEmail && { hospitalEmail }),
            ...(hospitalAddress && { hospitalAddress }),
            ...(state && { state }),
            ...(city && { city }),
            ...(userId && { userId })
        };

        const hospital = await Hospital.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
        if (!hospital) {
            return res.status(404).json({ message: "Hospital not found", success: false });
        }
        return res.status(200).json({ hospital, success: true });
    } catch (error) {
        console.error('Error updating hospital:', error);
        res.status(400).json({ message: 'Failed to update hospital', success: false });
    }
};

// Delete hospital by ID
export const deleteHospital = async (req, res) => {
    try {
        const { id } = req.params;
        const hospital = await Hospital.findByIdAndDelete(id);
        if (!hospital) {
            return res.status(404).json({ message: "Hospital not found", success: false });
        }
        return res.status(200).json({ hospital, success: true });
    } catch (error) {
        console.error('Error deleting hospital:', error);
        res.status(500).json({ message: 'Failed to delete hospital', success: false });
    }
};

export const searchHospitals = async (req, res) => {
    try {
        const { search } = req.query;
        if (!search) {
            return res.status(400).json({ message: 'Search query is required', success: false });
        }

        const regex = new RegExp(search, 'i'); // Case-insensitive search

        const hospitals = await Hospital.find({
            $or: [
                { hospitalName: regex },
                { hospitalEmail: regex },
                { hospitalAddress: regex },
                { adminPhoneNo: regex },
                { accountPhoneNo: regex },
                { city: regex },
                { state: regex }
            ]
        });

        if (!hospitals) {
            return res.status(404).json({ message: 'No hospitals found', success: false });
        }

        return res.status(200).json({
            hospitals: hospitals,
            success: true,
            pagination: {
                currentPage: 1,
                totalPages: Math.ceil(hospitals.length / 12),
                totalHospitals: hospitals.length,
            },
        });
    } catch (error) {
        console.error('Error searching hospitals:', error);
        res.status(500).json({ message: 'Failed to search hospitals', success: false });
    }
};
