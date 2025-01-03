import { Appointment } from '../models/appointment.model.js'; // Adjust the path according to your project structure

// Add a new appointment
export const addAppointment = async (req, res) => {
    try {
        const { patientId,title,appointmentType,notes, doctorId, centerId, start, end, userId } = req.body;

        // Validate required fields
        if (appointmentType != "quick") {if (!patientId || !title || !start || !end) {
            return res.status(400).json({ message: 'Patient ID and time are required', success: false });
        }}

        if (appointmentType != "Regular" ){if( !notes || !title ) {
            return res.status(400).json({ message: 'Notes & Patient Name are required', success: false });
        }}

        // Create a new appointment
        const appointment = new Appointment({
            patientId,
            title,
            appointmentType,
            notes,
            doctorId,
            centerId: centerId || null,
            start,
            end,
            userId: userId || null
        });

        await appointment.save();
        res.status(201).json({ appointment, success: true });
    } catch (error) {
        console.error('Error adding appointment:', error);
        res.status(500).json({ message: 'Failed to add appointment', success: false });
    }
};

// Get all appointments
export const getAppointments = async (req, res) => {
    try {
        const appointments = await Appointment.find();
        if (!appointments) {
            return res.status(404).json({ message: 'No appointments found', success: false });
        }
        res.status(200).json({ appointments, success: true });
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ message: 'Failed to fetch appointments', success: false });
    }
};

// Get appointments by patient ID
export const getAppointmentsByPatientId = async (req, res) => {
    try {
        const { id } = req.params;
        const appointments = await Appointment.find({ patientId: id });
        if (!appointments) {
            return res.status(404).json({ message: 'No appointments found for this patient', success: false });
        }
        res.status(200).json({ appointments, success: true });
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ message: 'Failed to fetch appointments', success: false });
    }
};

// Get appointment by ID
export const getAppointmentById = async (req, res) => {
    try {
        const { id } = req.params;
        const appointment = await Appointment.findById(id);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found', success: false });
        }
        res.status(200).json({ appointment, success: true });
    } catch (error) {
        console.error('Error fetching appointment:', error);
        res.status(500).json({ message: 'Failed to fetch appointment', success: false });
    }
};

// Update appointment by ID
export const updateAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { patientId,title,appointmentType,notes, doctorId, centerId, start, end,  userId } = req.body;

        // Build updated data
        const updatedData = {
            ...(patientId && { patientId }),
            ...(title && { title }),
            ...(appointmentType && { appointmentType }),
            ...(notes && { notes }),
            ...(doctorId && { doctorId }),
            centerId: centerId || null,
            ...(start && { start }),
            ...(end && { end }),
            userId: userId || null
        };

        const appointment = await Appointment.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found', success: false });
        }
        res.status(200).json({ appointment, success: true });
    } catch (error) {
        console.error('Error updating appointment:', error);
        res.status(400).json({ message: 'Failed to update appointment', success: false });
    }
};

// Delete appointment by ID
export const deleteAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const appointment = await Appointment.findByIdAndDelete(id);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found', success: false });
        }
        res.status(200).json({ appointment, success: true });
    } catch (error) {
        console.error('Error deleting appointment:', error);
        res.status(500).json({ message: 'Failed to delete appointment', success: false });
    }
};
