import { Patient } from '../models/patient.model.js'; // Update the path as per your project structure

// Add a new patient
export const addPatient = async (req, res) => {
    try {
        const { patientName, gender, phoneNo, age, address, patientType, reference, centerId,state,city,caseId, userId } = req.body;

        // Validate required fields
        if (!patientName || !gender || !phoneNo || !age || !address || !patientType) {
            return res.status(400).json({ message: 'All required fields must be filled', success: false });
        }

        // Create a new patient
        const patient = new Patient({
            patientName,
            gender,
            phoneNo,
            age,
            address,
            patientType,
            reference,
            centerId:(centerId === '')  ? null:centerId,
            state,
            city,
            caseId,
            userId
        });

        await patient.save();
        res.status(201).json({ patient, success: true });
    } catch (error) {
        console.error('Error adding patient:', error);
        res.status(500).json({ message: 'Failed to add patient', success: false });
    }
};

// Get all patients
export const getPatients = async (req, res) => {
    try {
        const patients = await Patient.find();
        if (!patients) {
            return res.status(404).json({ message: 'No patients found', success: false });
        }
        const outsidePatients = patients.filter(patient => patient.patientType === "Outside")
        const reversedpatients = patients.reverse();
        const page = parseInt(req.query.page) || 1;

        // Define the number of items per page
        const limit = 12;

        // Calculate the start and end indices for pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        // Paginate the reversed movies array
        const paginatedpatients = reversedpatients.slice(startIndex, endIndex);
        return res.status(200).json({ 
            patients:paginatedpatients, 
            outsidePatients:outsidePatients,
            success: true ,
            pagination: {
            currentPage: page,
            totalPages: Math.ceil(patients.length / limit),
            totalpatients: patients.length,
        },});
    } catch (error) {
        console.error('Error fetching patients:', error);
        res.status(500).json({ message: 'Failed to fetch patients', success: false });
    }
};

export const getPatientsByCenterId = async (req, res) => {
    try {
        const { id } = req.params;
        const patients = await Patient.find({ centerId: id });
        if (!patients) {
            return res.status(404).json({ message: 'Patients not found', success: false });
        }
        res.status(200).json({ patients, success: true });
    } catch (error) {
        console.error('Error fetching patients:', error);
        res.status(500).json({ message: 'Failed to fetch patients', success: false });
    }
};

// Get patient by ID
export const getPatientById = async (req, res) => {
    try {
        const { id } = req.params;
        const patient = await Patient.findById(id);
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found', success: false });
        }
        res.status(200).json({ patient, success: true });
    } catch (error) {
        console.error('Error fetching patient:', error);
        res.status(500).json({ message: 'Failed to fetch patient', success: false });
    }
};

// Update patient by ID
export const updatePatient = async (req, res) => {
    try {
        const { id } = req.params;
        const { patientName, gender, phoneNo, age, address, patientType, reference, centerId,state,city,caseId, userId } = req.body;

        // Build updated data
        const updatedData = {
            ...(patientName && { patientName }),
            ...(gender && { gender }),
            ...(phoneNo && { phoneNo }),
            ...(age && { age }),
            ...(address && { address }),
            ...(patientType && { patientType }),
            ...(reference && { reference }),
            centerId: (centerId === "") ? null : centerId ,
            ...(state && { state }),
            ...(city && { city }),
            ...(caseId && { caseId }),
            ...(userId && { userId }),
        };

        const patient = await Patient.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found', success: false });
        }
        res.status(200).json({ patient, success: true });
    } catch (error) {
        console.error('Error updating patient:', error);
        res.status(400).json({ message: 'Failed to update patient', success: false });
    }
};

// Delete patient by ID
export const deletePatient = async (req, res) => {
    try {
        const { id } = req.params;
        const patient = await Patient.findByIdAndDelete(id);
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found', success: false });
        }
        res.status(200).json({ patient, success: true });
    } catch (error) {
        console.error('Error deleting patient:', error);
        res.status(500).json({ message: 'Failed to delete patient', success: false });
    }
};

export const dashboardPatients = async (req, res) => {
    try {
        const totalPatients = await Patient.countDocuments(); // Get total count

        const lastFivePatients = await Patient.find({}, { patientName: 1, _id: 1 }) // Select only patientName
            .sort({ createdAt: -1 }) // Sort by creation date (descending)
            .limit(5); // Get last 5 Patients

        return res.status(200).json({ 
            totalPatients, 
            patients: lastFivePatients 
        });
    } catch (error) {
        console.error('Error fetching Patients:', error);
        res.status(500).json({ message: 'Failed to fetch Patients', success: false });
    }
};

export const searchPatients = async (req, res) => {
    try {
        const { search } = req.query;
        if (!search) {
            return res.status(400).json({ message: 'Search query is required', success: false });
        }

        const regex = new RegExp(search, 'i'); // Case-insensitive search

        const patients = await Patient.find({
            $or: [
                { patientName: regex },
                { patientType: regex },
                { gender: regex },
                { phoneNo: regex },
                { age: regex },
                { city: regex },
                { state: regex },
                { address: regex },
                { reference: regex },
            ]
        });

        if (!patients) {
            return res.status(404).json({ message: 'No patients found', success: false });
        }

        return res.status(200).json({
            patients: patients,
            success: true,
            pagination: {
                currentPage: 1,
                totalPages: Math.ceil(patients.length / 12),
                totalPatients: patients.length,
            },
        });
    } catch (error) {
        console.error('Error searching patients:', error);
        res.status(500).json({ message: 'Failed to search patients', success: false });
    }
};
