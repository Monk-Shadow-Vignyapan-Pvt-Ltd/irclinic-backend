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
        res.status(200).json({ patients, success: true });
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
