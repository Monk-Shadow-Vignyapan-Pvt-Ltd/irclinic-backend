import { Doctor } from '../models/doctor.model.js'; // Update the path as per your project structure

// Add a new doctor
export const addDoctor = async (req, res) => {
    try {
        const { firstName, lastName, gender, phoneNo, email, company, state, city, speciality, isPartner,centerId, userId } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !gender || !phoneNo || !email || !company || !state || !city || !speciality) {
            return res.status(400).json({ message: 'All fields are required', success: false });
        }

        // Create a new doctor
        const doctor = new Doctor({
            firstName,
            lastName,
            gender,
            phoneNo,
            email,
            company,
            state,
            city,
            speciality,
            isPartner,
            centerId:(centerId === '')  ? null:centerId,
            userId
        });

        await doctor.save();
        res.status(201).json({ doctor, success: true });
    } catch (error) {
        console.error('Error adding doctor:', error);
        res.status(500).json({ message: 'Failed to add doctor', success: false });
    }
};

// Get all doctors
export const getDoctors = async (req, res) => {
    try {
        const doctors = await Doctor.find();
        if (!doctors ) {
            return res.status(404).json({ message: "No doctors found", success: false });
        }
        const reverseddoctors = doctors.reverse();
        const page = parseInt(req.query.page) || 1;

        // Define the number of items per page
        const limit = 12;

        // Calculate the start and end indices for pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        // Paginate the reversed movies array
        const paginateddoctors = reverseddoctors.slice(startIndex, endIndex);
        return res.status(200).json({ 
            doctors:paginateddoctors, 
            success: true ,
            pagination: {
            currentPage: page,
            totalPages: Math.ceil(doctors.length / limit),
            totaldoctors: doctors.length,
        },});
    } catch (error) {
        console.error('Error fetching doctors:', error);
        res.status(500).json({ message: 'Failed to fetch doctors', success: false });
    }
};

// Get doctor by ID
export const getDoctorById = async (req, res) => {
    try {
        const { id } = req.params;
        const doctor = await Doctor.findById(id);
        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found", success: false });
        }
        return res.status(200).json({ doctor, success: true });
    } catch (error) {
        console.error('Error fetching doctor:', error);
        res.status(500).json({ message: 'Failed to fetch doctor', success: false });
    }
};

// Update doctor by ID
export const updateDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, gender, phoneNo, email, company, state, city, speciality, isPartner,centerId, userId } = req.body;

        // Build updated data
        const updatedData = {
            ...(firstName && { firstName }),
            ...(lastName && { lastName }),
            ...(gender && { gender }),
            ...(phoneNo && { phoneNo }),
            ...(email && { email }),
            ...(company && { company }),
            ...(state && { state }),
            ...(city && { city }),
            ...(speciality && { speciality }),
            ...(isPartner !== undefined && { isPartner }),
            centerId: (centerId === "") ? null : centerId ,
            ...(userId && { userId })
        };

        const doctor = await Doctor.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found", success: false });
        }
        return res.status(200).json({ doctor, success: true });
    } catch (error) {
        console.error('Error updating doctor:', error);
        res.status(400).json({ message: 'Failed to update doctor', success: false });
    }
};

// Delete doctor by ID
export const deleteDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const doctor = await Doctor.findByIdAndDelete(id);
        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found", success: false });
        }
        return res.status(200).json({ doctor, success: true });
    } catch (error) {
        console.error('Error deleting doctor:', error);
        res.status(500).json({ message: 'Failed to delete doctor', success: false });
    }
};
