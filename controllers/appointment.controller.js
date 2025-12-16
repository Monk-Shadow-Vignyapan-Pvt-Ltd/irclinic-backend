import { Appointment } from '../models/appointment.model.js'; // Adjust the path according to your project structure
import { Invoice } from '../models/invoice.model.js';
import { Estimate } from '../models/estimate.model.js';
import admin from "firebase-admin";
import dotenv from "dotenv";
import { FirebaseToken } from '../models/firebaseToken.model.js';
import { User } from '../models/user.model.js';
import { Doctor } from '../models/doctor.model.js';
import mongoose from "mongoose";
import { io } from "../index.js";
import { Center } from '../models/center.model.js';
import { Patient } from '../models/patient.model.js';
import { Procedure } from '../models/procedure.model.js';
import axios from "axios";
import cron from "node-cron";
import moment from "moment";
import { Quicknote } from "../models/quicknote.model.js";
import { Service } from '../models/service.model.js';
import { Stockin } from '../models/stockin.model.js';
import { Stockout } from '../models/stockout.model.js';
import sharp from 'sharp';

dotenv.config();

const firebaseConfig = JSON.parse(Buffer.from(process.env.FIREBASE_CREDENTIALS, "base64").toString("utf8"));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig),
    });
}

// Add a new appointment
export const addAppointment = async (req, res) => {
    try {
        const { patientId, appointmentType, title, doctorId, centerId, start, end, reason, reports, procedurePlan, investigationReports, progressNotes, invoiceId, estimateId,quicknoteId, isCancelled, cancelby, cancelReason, userId, status, isFollowUp } = req.body;

        if (!patientId || !title || !start || !end) {
            return res.status(400).json({ message: 'Patient ID and time are required', success: false });
        }


        // Create a new appointment
        const appointment = new Appointment({
            patientId,
            appointmentType,
            title,
            doctorId,
            centerId: centerId || null,
            start,
            end,
            reason,
            reports, procedurePlan, investigationReports, progressNotes, invoiceId, estimateId,quicknoteId,
            isCancelled, cancelby, cancelReason,
            userId: userId || null,
            status: status || "Scheduled",
            isFollowUp,
            isOnline:false
        });

        await appointment.save();
        io.emit("appointmentAddUpdate",  { success: true } );
        // Fetch users who should receive notifications
        if(appointmentType === 'Outside'){
            const firebasetokens = await FirebaseToken.find();
            const users = await User.find();
            const filteredUsers = users.filter(user => (user.role === "Super Admin" || user.role === "Center Head"));
    
            const filterTokens = firebasetokens.filter(token =>
                filteredUsers.some(user => user._id.toString() === token.userId.toString())
            );
    
            const tokens = [
                ...new Set(
                  filterTokens
                    .filter(token => token.centerId.toString() === centerId.toString())
                    .flatMap(user => [user.webToken, user.mobileToken])  // Include both tokens
                    .filter(token => token)  // Remove undefined or null values
                )
              ];
            const doctor = await Doctor.findById(doctorId);
    
    
            const notificationMessage = {
                title: `New Appointment Created For Doctor ${doctor.firstName} ${doctor.lastName}`,
                body: `An appointment with ${title} is scheduled on ${new Date(start).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}.`,
                type: "Appointment",
                date: new Date(),
                appointmentId: appointment._id,
                isView:false,
                link:"/appointment"
            };
    
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            sevenDaysAgo.setHours(0, 0, 0, 0);
    
            // Store notifications in each matched user
            await User.updateMany(
                       {
                         _id: { $in: filteredUsers.map(user => user._id) },
                         $or: [
                           { centerId: new mongoose.Types.ObjectId(centerId) },
                           { centerId: centerId.toString() }
                         ]
                       },
                       [
                         {
                           $set: {
                             notifications: {
                               $filter: {
                                 input: { $ifNull: ["$notifications", []] }, // ensures it's always an array
                                 as: "notif",
                                 cond: { $gte: [{ $toDate: "$$notif.date" }, sevenDaysAgo] }
                               }
                             }
                           }
                         }
                       ]
                     );
            
                                    await User.updateMany(
                                        { 
                                            _id: { $in: filteredUsers.map(user => user._id) },
                                            $or: [
                                                { centerId: new mongoose.Types.ObjectId(centerId) }, // Match ObjectId
                                                { centerId: centerId.toString() } // Match string version
                                            ]
                                        },
                                        { 
                                            $push: { notifications: notificationMessage },
                                        }
                                    );

                                    io.emit("notification",  { success: true }  );
    
            // Send Firebase Notification
            if (tokens.length > 0) {
                const message = {
                    notification: {
                        title: notificationMessage.title,
                        body: notificationMessage.body
                    },
                    data: { // ✅ Add URL inside "data"
                        url: "https://console.interventionalradiology.co.in"
                    },
                    tokens: tokens, // Use tokens array for multicast
                };
    
                admin.messaging().sendEachForMulticast(message)
                    .then(response => {
                        response.responses.forEach((resp, index) => {
                            if (!resp.success) {
                                console.error(`Error sending to token ${tokens[index]}:`, resp.error);
                            }
                        });
                    })
                    .catch(error => {
                        console.error("Firebase Messaging Error:", error);
                    });
            }
        }else{
            const patient = await Patient.findById(patientId)
            const doctor = await Doctor.findById(doctorId);
            const center = await Center.findById(centerId);
            if(isFollowUp){
              await sendFollowupAppointmentConfirmation(appointment,patient, doctor, center);
            }else{
              await sendAppointmentConfirmation(appointment,patient, doctor, center);
            }
            
            if (patient.reference) {
              // if(isFollowUp){
              //   await sendRefFollowUpAppointmentConfirmation(appointment,patient, doctor, center); 
              // }else{
                await sendRefAppointmentConfirmation(appointment,patient, doctor, center); 
             // }
             
            }
        }
       

        res.status(201).json({ appointment, success: true });
    } catch (error) {
        console.error('Error adding appointment:', error);
        res.status(500).json({ message: 'Failed to add appointment', success: false });
    }
};

export const addOnlineAppointment = async (req, res) => {
    try {
        const { fullName, gender, center, age, appointmentDate, appointmentTime, patientPhoneNo } = req.body;

        if (!fullName || !patientPhoneNo || !appointmentDate || !appointmentTime) {
            return res.status(400).json({ message: 'Required Fields are missing', success: false });
        }

        const selectedCenter = await Center.findById(center);
        if (!selectedCenter) {
            return res.status(404).json({ message: 'Center not found', success: false });
        }

        // ✅ Check if patient already exists with same phoneNo in this center
        let patient = await Patient.findOne({ phoneNo: patientPhoneNo, centerId: center });

        if (!patient) {
            // Find last online patient for generating caseId
            const latestOnlinePatient = await Patient.findOne({
                centerId: center,
                isOnline: true,
                caseId: { $regex: `${selectedCenter.centerCode}-ON-` }
            })
            .sort({ createdAt: -1 })
            .lean();

            let sequenceNumber = 1;
            if (latestOnlinePatient) {
                const lastSeq = parseInt(latestOnlinePatient.caseId.slice(-7), 10);
                sequenceNumber = lastSeq + 1;
            }

            const formattedDate = new Date(appointmentDate)
                .toLocaleDateString('en-GB')
                .replace(/\//g, '');

            const paddedSequence = sequenceNumber.toString().padStart(7, '0');

            // Create new patient
            patient = new Patient({
                patientName: fullName,
                gender,
                phoneNo: patientPhoneNo,
                age,
                patientType: "OPD",
                centerId: center,
                isOnline: true,
                caseId: `${selectedCenter.centerCode}-ON-${formattedDate}-${paddedSequence}`,
            });
            await patient.save();
        }

        // ✅ Find doctors
        const doctors = await Doctor.find({
            $or: [
                { centerId: center, isPartner: false },
                { superDoctor: true }
            ]
        });

        let doctor = null;
        if (doctors.length > 0) {
            const randomIndex = Math.floor(Math.random() * doctors.length);
            doctor = doctors[randomIndex];
        }

        if (!doctor) {
            return res.status(400).json({ message: "No doctor available", success: false });
        }

        
        const [hours, minutes] = appointmentTime.split(":").map(Number);

        // Parse the appointmentDate string
        const appointmentDateObj = new Date(appointmentDate);

        // ⚡ Extract date in IST (not UTC!)
        const istYear = appointmentDateObj.getUTCFullYear();
        const istMonth = appointmentDateObj.getUTCMonth();
        const istDate = appointmentDateObj.getUTCDate() + 1; // adjust since picker gave UTC midnight of previous day

        // Build datetime in IST
        const selectedDateTime = new Date(
          istYear,
          istMonth,
          istDate,
          hours,
          minutes,
          0
        );

        // Convert to UTC for DB (Mongo stores ISO UTC automatically)
        const start = new Date(selectedDateTime.getTime() - (5.5 * 60 * 60 * 1000)); 
        const end = new Date(start.getTime() + 15 * 60000);

          if (isNaN(start.getTime())) {
            return res.status(400).json({ message: "Invalid time selected", success: false });
          }

          // Save in DB
          const appointment = new Appointment({
            patientId: patient._id,
            appointmentType: "OPD",
            title: fullName,
            doctorId: doctor._id,
            centerId: center || null,
            start,   // UTC ISO string (e.g. 2025-09-06T04:30:00.000Z)
            end,
            status: "Scheduled",
            isOnline: true
          });
          await appointment.save();

        io.emit("appointmentAddUpdate", { success: true });

        await sendAppointmentConfirmation(appointment, patient, doctor, selectedCenter);

        res.status(201).json({ appointment, success: true });
    } catch (error) {
        console.error("Error adding appointment:", error);
        res.status(500).json({ message: "Failed to add appointment", success: false });
    }
};


// Get all appointments
export const getAppointments = async (req, res) => {
    try {
        const { start, end } = req.query;
        const { id } = req.params;

        if (!start || !end) {
            return res.status(400).json({ message: "Start and end dates are required", success: false });
        }

        const appointments = await Appointment.find({
            centerId: id,
            start: { $gte: new Date(start) },
            end: { $lte: new Date(end) },
        }).populate('patientId', 'patientName');

        const mappedAppointments = appointments.map(app => ({
            ...app._doc,
            title: app.patientId?.patientName || 'Unnamed Patient',
            patientId:app.patientId?._id
        }));

        res.status(200).json({ appointments:mappedAppointments, success: true });
    } catch (error) {
        console.error("Error fetching appointments:", error);
        res.status(500).json({ message: "Failed to fetch appointments", success: false });
    }
};


// Get appointments by patient ID
export const getAppointmentsByPatientId = async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch all appointments for the given patient ID
        const appointments = await Appointment.find({ patientId: id });

        if (!appointments ) {
            return res.status(404).json({ message: 'No appointments found for this patient', success: false });
        }

        // Enhance appointments with corresponding invoicePlan if invoiceId exists
        const enhancedAppointments = await Promise.all(
            appointments.map(async (appointment) => {
                if (appointment.invoiceId && appointment.invoiceId.length > 0) {
                    let invoices = [];
                    if (Array.isArray(appointment.invoiceId)) {
                        invoices = await Invoice.find({ _id: { $in: appointment.invoiceId } });
                    } else {
                        const invoice = await Invoice.findOne({ _id: appointment.invoiceId });
                        if (invoice) {
                            invoices.push(invoice);
                        }
                    }

                    const invoicesData = invoices.map(inv => ({
                        invoicePlan: inv.invoicePlan,
                        invoiceDate: inv.createdAt,
                        invoiceUserId: inv.userId
                    }));

                    if(appointment.quicknoteId){
                        const qn = await Quicknote.findOne({ _id: appointment.quicknoteId });
                        const quicknoteWithAudio = {
                            ...qn._doc,
                            audio: qn.audio ? qn.audio.toString("base64") : null,
                        };
                        const quicknoteDate = qn.createdAt;
                        return { ...appointment.toObject(), invoices: invoicesData, quicknote: quicknoteWithAudio, quicknoteDate }; // Convert Mongoose document to plain object
                    } else {
                        return { ...appointment.toObject(), invoices: invoicesData }; // Convert Mongoose document to plain object
                    }
                }
                else if(appointment.invoiceId && !Array.isArray(appointment.invoiceId) ){
                   let invoices = [];
                    const invoice = await Invoice.findOne({ _id: appointment.invoiceId });
                        if (invoice) {
                            invoices.push(invoice);
                        }


                   const invoicesData = invoices.map(inv => ({
                        invoicePlan: inv.invoicePlan,
                        invoiceDate: inv.createdAt,
                        invoiceUserId: inv.userId
                    }));

                    if(appointment.quicknoteId){
                        const qn = await Quicknote.findOne({ _id: appointment.quicknoteId });
                        const quicknoteWithAudio = {
                            ...qn._doc,
                            audio: qn.audio ? qn.audio.toString("base64") : null,
                        };
                        const quicknoteDate = qn.createdAt;
                        return { ...appointment.toObject(), invoices: invoicesData, quicknote: quicknoteWithAudio, quicknoteDate }; // Convert Mongoose document to plain object
                    } else {
                        return { ...appointment.toObject(), invoices: invoicesData }; // Convert Mongoose document to plain object
                    }

                }
                else if (appointment.estimateId) {
                    const estimate = await Estimate.findOne({ _id: appointment.estimateId });
                    const estimatePlan = estimate.estimatePlan;
                    const estimateDate = estimate.createdAt;
                    if(appointment.quicknoteId){
                    const qn = await Quicknote.findOne({ _id: appointment.quicknoteId });
                    const quicknoteWithAudio = {
                        ...qn._doc,
                        audio: qn.audio ? qn.audio.toString("base64") : null,
                    };
                    const quicknoteDate = qn.createdAt;
                    return { ...appointment.toObject(),estimatePlan,estimateDate  , quicknote:quicknoteWithAudio,quicknoteDate }; // Convert Mongoose document to plain object
                    }else{
                       return { ...appointment.toObject(), estimatePlan,estimateDate }; // Convert Mongoose document to plain object
                    }
                   
                    
                } else if(appointment.quicknoteId){
                    const qn = await Quicknote.findOne({ _id: appointment.quicknoteId });
                    const quicknoteWithAudio = {
                        ...qn._doc,
                        audio: qn.audio ? qn.audio.toString("base64") : null,
                    };
                    const quicknoteDate = qn.createdAt;
                    return { ...appointment.toObject(), quicknote:quicknoteWithAudio,quicknoteDate }; // Convert Mongoose document to plain object
                }
                return appointment.toObject(); // If no invoiceId, return appointment as-is
            })
        );

        res.status(200).json({ appointments: enhancedAppointments, success: true });
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ message: 'Failed to fetch appointments', success: false });
    }
};

export const getLastAppointmentByPatientId = async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch all appointments for the given patient ID
        const appointment = await Appointment.findOne({ patientId: id })
            .sort({ createdAt: -1 }); // Latest first

        if (!appointment ) {
            return res.status(200).json({ appointment: {}, success: true });
        }

        res.status(200).json({ appointment, success: true });
    } catch (error) {
        console.error('Error fetching appointment:', error);
        res.status(500).json({ message: 'Failed to fetch appointment', success: false });
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
        const { patientId, appointmentType, title, doctorId, centerId, start, end, reason, reports, procedurePlan, investigationReports, progressNotes, invoiceId, estimateId, isCancelled, cancelby, cancelReason, userId, status, isFollowUp,checkInTime,checkOutTime } = req.body;

         

        // Build updated data
        const updatedData = {
            ...(patientId && { patientId }),
            ...(appointmentType && { appointmentType }),
            ...(title && { title }),
            ...(doctorId && { doctorId }),
            centerId: centerId || null,
            ...(start && { start }),
            ...(end && { end }),
            ...(reason && { reason }),
            reports, procedurePlan, investigationReports, progressNotes, invoiceId, estimateId,
            isCancelled, cancelby, cancelReason,
            userId: userId || null,
            ...(status && { status }),
            isFollowUp,
            checkInTime,checkOutTime,
        };

        const existingAppointment = await Appointment.findById(id);

        if (!existingAppointment) {
            return res.status(404).json({ message: 'Appointment not found', success: false });
        }

        let reportsChanged = false;

      if (reports && existingAppointment.reports) {
          // ✅ If new reports count is greater → a new report was added
          if (reports.length > existingAppointment.reports.length) {
              reportsChanged = true;
          }
      }

        const appointment = await Appointment.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });

        io.emit("appointmentAddUpdate",  { success: true }  );

        if (appointmentType === "OPD") {
            
            io.emit("appointmentStatusUpdated",  appointment );
        }
        
        // Fetch users who should receive notifications
        if(appointmentType === 'Outside'){
        const firebasetokens = await FirebaseToken.find();
        const users = await User.find();
        const filteredUsers = users.filter(user => (user.role === "Super Admin" || user.role === "Center Head"));

        const filterTokens = firebasetokens.filter(token =>
            filteredUsers.some(user => user._id.toString() === token.userId.toString())
        );

        const tokens = [
            ...new Set(
              filterTokens
                .filter(token => token.centerId.toString() === centerId.toString())
                .flatMap(user => [user.webToken, user.mobileToken])  // Include both tokens
                .filter(token => token)  // Remove undefined or null values
            )
          ];
        const doctor = await Doctor.findById(doctorId);


        const notificationMessage = {
            title: `Appointment Updated For Doctor ${doctor.firstName} ${doctor.lastName}`,
            body: `An appointment with ${title} is scheduled on ${new Date(start).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}.`,
            type: "Appointment",
            date: new Date(),
            appointmentId: appointment._id,
            isView:false,
            link:"/appointment"
        };

        const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            sevenDaysAgo.setHours(0, 0, 0, 0);

        // Store notifications in each matched user
         await User.updateMany(
                    {
                      _id: { $in: filteredUsers.map(user => user._id) },
                      $or: [
                        { centerId: new mongoose.Types.ObjectId(centerId) },
                        { centerId: centerId.toString() }
                      ]
                    },
                    [
                      {
                        $set: {
                          notifications: {
                            $filter: {
                              input: { $ifNull: ["$notifications", []] }, // ensures it's always an array
                              as: "notif",
                              cond: { $gte: [{ $toDate: "$$notif.date" }, sevenDaysAgo] }
                            }
                          }
                        }
                      }
                    ]
                  );
        
                                await User.updateMany(
                                    { 
                                        _id: { $in: filteredUsers.map(user => user._id) },
                                        $or: [
                                            { centerId: new mongoose.Types.ObjectId(centerId) }, // Match ObjectId
                                            { centerId: centerId.toString() } // Match string version
                                        ]
                                    },
                                    { 
                                        $push: { notifications: notificationMessage },
                                    }
                                );
                                io.emit("notification",  { success: true }  );

        // Send Firebase Notification
        if (tokens.length > 0) {
            const message = {
                notification: {
                    title: notificationMessage.title,
                    body: notificationMessage.body
                },
                data: { // ✅ Add URL inside "data"
                    url: "https://console.interventionalradiology.co.in"
                },
                tokens: tokens, // Use tokens array for multicast
            };

            admin.messaging().sendEachForMulticast(message)
                .then(response => {
                    response.responses.forEach((resp, index) => {
                        if (!resp.success) {
                            console.error(`Error sending to token ${tokens[index]}:`, resp.error);
                        }
                    });
                })
                .catch(error => {
                    console.error("Firebase Messaging Error:", error);
                });
        }
    }else{
      const patient = await Patient.findById(patientId)
       const center = await Center.findById(centerId);
            if (reportsChanged && patient.reference) {
              
                await sendRefAppointmentImpression(patient,reports); 
              
             
            }
            const newInvoiceIds = Array.isArray(invoiceId) ? invoiceId : (invoiceId ? [invoiceId] : []);
            const existingInvoiceIds = Array.isArray(existingAppointment.invoiceId) ? existingAppointment.invoiceId : (existingAppointment.invoiceId ? [existingAppointment.invoiceId] : []);

            const newlyAddedInvoiceIds = newInvoiceIds.filter(newId =>
                !existingInvoiceIds.some(existingId => existingId.toString() === newId.toString())
            );

            for (const invId of newlyAddedInvoiceIds) {
                await sendPatientInvoice(patient, invId, center);
            }
            
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
        io.emit("appointmentAddUpdate",  { success: true } );
        res.status(200).json({ appointment, success: true });
    } catch (error) {
        console.error('Error deleting appointment:', error);
        res.status(500).json({ message: 'Failed to delete appointment', success: false });
    }
};

export const dashboardAppointments = async (req, res) => {
    try {
        const { id } = req.params;
        const totalAppointments = await Appointment.countDocuments({ centerId: id }); // Get total count

        const lastFiveAppointments = await Appointment.find({ centerId: id, }, { title: 1, _id: 1 }) // Select only title
            .sort({ createdAt: -1 }) // Sort by creation date (descending)
            .limit(5); // Get last 5 appointments

        return res.status(200).json({
            totalAppointments,
            appointments: lastFiveAppointments
        });
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ message: 'Failed to fetch appointments', success: false });
    }
};

export const getNonStockAppointments = async (req, res) => {
  try {
    const { id } = req.params;

    const estimates = await Estimate.find({
      centerId: id,
      "estimatePlan.nonStockInventories.0": { $exists: true }
    }).lean();

    const invoices = await Invoice.find({
      centerId: id,
      "invoicePlan.nonStockInventories.0": { $exists: true }
    }).lean();

    const enhancedEstimates = await Promise.all(
      estimates.map(async (estimate) => {
        let patientName = null;

        if (estimate.appointmentId) {
          const appointment = await Appointment.findById(estimate.appointmentId).lean();
          patientName = appointment?.title || null;
        }

        if (estimate.patientId) {
          const patient = await Patient.findById(estimate.patientId).lean();
          patientName = patient?.patientName || patientName;
        }

        return { ...estimate, patientName };
      })
    );

    const enhancedInvoices = await Promise.all(
      invoices.map(async (invoice) => {
        let patientName = null;

        if (invoice.appointmentId) {
          const appointment = await Appointment.findById(invoice.appointmentId).lean();
          patientName = appointment?.title || null;
        }

        if (invoice.patientId) {
          const patient = await Patient.findById(invoice.patientId).lean();
          patientName = patient?.patientName || patientName;
        }

        return { ...invoice, patientName };
      })
    );

    const mergedData = [...enhancedEstimates, ...enhancedInvoices];



    res.status(200).json({
      invoices: mergedData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      success: true,
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({ message: "Failed to fetch invoices", success: false });
  }
};


const sendAppointmentConfirmation = async (appointment, patient, doctor, center) => {
  const appointmentDate = moment.utc(appointment.start).add(5, 'hours').add(30, 'minutes');

// Also create 'now' in IST for fair comparison
const now = moment.utc().add(5, 'hours').add(30, 'minutes'); // IST now

if (appointmentDate.isBefore(now)) {
    console.log("Appointment is not in the future. WhatsApp message skipped.");
    return;
}

// Format date and time for message
const formattedDate = appointmentDate.format('DD/MM/YYYY');
const formattedTime = appointmentDate.format('hh:mm A');


    let procedureSection = '';
    let enrichedProcedures = [];

    if (appointment.reason && Array.isArray(appointment.reason)) {
        enrichedProcedures = await Promise.all(
            appointment.reason.map(async (rea) => {
                const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
                if (rea.value && isValidObjectId(rea.value)) {
                    const procedure = await Service.findById(rea.value);
                    if (procedure ) {
                        return {
                            name: procedure.serviceName || procedure.name || "Procedure",
                            link: `https://irclinicindia.com/procedures/${procedure.serviceUrl}` || ""
                        };
                    }
                }
                return null;
            })
        );
        enrichedProcedures = enrichedProcedures.filter(p => p);

    }

    if (enrichedProcedures.length > 0) {
        const procedureLines = enrichedProcedures.map(proc => {
          if (proc.link) {
            return `🔹 *${proc.name}*: ${proc.link}`;
          }
          return '';
        });
      
        // Join with commas instead of newlines
        procedureSection = '📖 To learn more about your procedures: ' + procedureLines.filter(Boolean).join(' | ');
      }

    const payload = {
        apiKey: process.env.AISENSY_API_KEY,
        campaignName: "Appointment Confirmation2",  // ✅ Must match your campaign in Aisensy
        subCampaignName: appointment._id.toString(), // ✅ Unique per message
        destination: `+91${patient.phoneNo}`,
        userName: "IR Clinic",
        templateParams: [
          patient.patientName,
          formattedDate,
          formattedTime,
          `${doctor.firstName} ${doctor.lastName}`,
          center.centerAddress || "IR Clinic",
          center.adminPhoneNo || "0000000000",
          procedureSection.trim() || "https://irclinicindia.com/"
        ],
        source: "new-landing-page form",
        paramsFallbackValue: {
          FirstName: "user"
        }
      };

    try {
        const { data } = await axios.post("https://backend.aisensy.com/campaign/t1/api/v2", payload);
        //console.log("WhatsApp API Response:", data);
    } catch (err) {
        console.error("WhatsApp API Error:", err.response?.data || err.message);
    }
};

const sendFollowupAppointmentConfirmation = async (appointment, patient, doctor, center) => {
  const appointmentDate = moment.utc(appointment.start).add(5, 'hours').add(30, 'minutes');

// Also create 'now' in IST for fair comparison
const now = moment.utc().add(5, 'hours').add(30, 'minutes'); // IST now

if (appointmentDate.isBefore(now)) {
    console.log("Appointment is not in the future. WhatsApp message skipped.");
    return;
}

// Format date and time for message
const formattedDate = appointmentDate.format('DD/MM/YYYY');
const formattedTime = appointmentDate.format('hh:mm A');


    let procedureSection = '';
    let enrichedProcedures = [];

    if (appointment.reason && Array.isArray(appointment.reason)) {
        enrichedProcedures = await Promise.all(
            appointment.reason.map(async (rea) => {
                const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
                if (rea.value && isValidObjectId(rea.value)) {
                     const procedure = await Service.findById(rea.value);
                    if (procedure ) {
                        return {
                            name: procedure.serviceName || procedure.name || "Procedure",
                            link: `https://irclinicindia.com/procedures/${procedure.serviceUrl}` || ""
                        };
                    }
                }
                return null;
            })
        );
        enrichedProcedures = enrichedProcedures.filter(p => p);

    }

    if (enrichedProcedures.length > 0) {
        const procedureLines = enrichedProcedures.map(proc => {
          if (proc.link) {
            return `🔹 *${proc.name}*: ${proc.link}`;
          }
          return '';
        });
      
        // Join with commas instead of newlines
        procedureSection = '📖 To learn more about your procedures: ' + procedureLines.filter(Boolean).join(' | ');
      }

    const payload = {
        apiKey: process.env.AISENSY_API_KEY,
        campaignName: "Followup Appointment Confirmation",  // ✅ Must match your campaign in Aisensy
        subCampaignName: appointment._id.toString(), // ✅ Unique per message
        destination: `+91${patient.phoneNo}`,
        userName: "IR Clinic",
        templateParams: [
          patient.patientName,
          formattedDate,
          formattedTime,
          `${doctor.firstName} ${doctor.lastName}`,
          center.centerAddress || "IR Clinic",
          center.adminPhoneNo || "0000000000",
          procedureSection.trim() || "https://irclinicindia.com/"
        ],
        source: "new-landing-page form",
        paramsFallbackValue: {
          FirstName: "user"
        }
      };

    try {
        const { data } = await axios.post("https://backend.aisensy.com/campaign/t1/api/v2", payload);
        //console.log("WhatsApp API Response:", data);
    } catch (err) {
        console.error("WhatsApp API Error:", err.response?.data || err.message);
    }
};

const sendRefAppointmentConfirmation = async (appointment, patient, doctor, center) => {
  const appointmentDate = moment.utc(appointment.start).add(5, 'hours').add(30, 'minutes');

// Also create 'now' in IST for fair comparison
const now = moment.utc().add(5, 'hours').add(30, 'minutes'); // IST now

if (appointmentDate.isBefore(now)) {
    console.log("Appointment is not in the future. WhatsApp message skipped.");
    return;
}

// Format date and time for message
const formattedDate = appointmentDate.format('DD/MM/YYYY');
const formattedTime = appointmentDate.format('hh:mm A');


  

  const payload = {
      apiKey: process.env.AISENSY_API_KEY,
      campaignName: "Appointment Confirmation Reference1",  // ✅ Must match your campaign in Aisensy
      subCampaignName: appointment._id.toString(), // ✅ Unique per message
      destination: `+91${patient.reference.referencePhoneNo}`,
      userName: "IR Clinic",
      templateParams: [
        patient.reference.label,
        patient.patientName,
        formattedDate,
        formattedTime,
        center.centerAddress || "IR Clinic",
      ],
      source: "new-landing-page form",
      paramsFallbackValue: {
        FirstName: "user"
      }
    };

  try {
      const { data } = await axios.post("https://backend.aisensy.com/campaign/t1/api/v2", payload);
      //console.log("WhatsApp API Response:", data);
  } catch (err) {
      console.error("WhatsApp API Error:", err.response?.data || err.message);
  }
};

const sendRefFollowUpAppointmentConfirmation = async (appointment, patient, doctor, center) => {
  const appointmentDate = moment.utc(appointment.start).add(5, 'hours').add(30, 'minutes');

// Also create 'now' in IST for fair comparison
const now = moment.utc().add(5, 'hours').add(30, 'minutes'); // IST now

if (appointmentDate.isBefore(now)) {
    console.log("Appointment is not in the future. WhatsApp message skipped.");
    return;
}

// Format date and time for message
const formattedDate = appointmentDate.format('DD/MM/YYYY');
const formattedTime = appointmentDate.format('hh:mm A');

  const payload = {
      apiKey: process.env.AISENSY_API_KEY,
      campaignName: "Follow Up Appointments For Reference Doctor1",  // ✅ Must match your campaign in Aisensy
      subCampaignName: appointment._id.toString(), // ✅ Unique per message
      destination: `+91${patient.reference.referencePhoneNo}`,
      userName: "IR Clinic",
      templateParams: [
        patient.reference.label,
        formattedDate,
        formattedTime,
        patient.patientName,
        center.centerAddress || "IR Clinic",
      ],
      source: "new-landing-page form",
      paramsFallbackValue: {
        FirstName: "user"
      }
    };

  try {
      const { data } = await axios.post("https://backend.aisensy.com/campaign/t1/api/v2", payload);
      //console.log("WhatsApp API Response:", data);
  } catch (err) {
      console.error("WhatsApp API Error:", err.response?.data || err.message);
  }
};

const sendRefAppointmentImpression = async (patient, reports) => {

  // ✅ Get last report instead of first
  const lastReport = reports[reports.length - 1];

  if (!lastReport) return;

  const appointmentDate = moment.utc(lastReport.creationReportDate)
    .add(5, 'hours')
    .add(30, 'minutes');

  const formattedDate = appointmentDate.format('DD/MM/YYYY');
  const formattedTime = appointmentDate.format('hh:mm A');

  const payload = {
    apiKey: process.env.AISENSY_API_KEY,
    campaignName: "Follow Up Impression Reference1", 
    subCampaignName: patient._id.toString(),
    destination: `+91${patient.reference.referencePhoneNo}`,
    userName: "IR Clinic",
    templateParams: [
      patient.reference.label,
      formattedDate,
      formattedTime,
      patient.patientName,
      lastReport.impression.replace(/<[^>]*>/g, '').trim(),  // ✅ LAST IMPRESSION
    ],
    source: "new-landing-page form",
    paramsFallbackValue: { FirstName: "user" }
  };

  try {
    await axios.post("https://backend.aisensy.com/campaign/t1/api/v2", payload);
  } catch (err) {
    console.error("WhatsApp API Error:", err.response?.data || err.message);
  }
};


const sendPatientInvoice = async (patient, invoiceId,center) => {
  const invoice = await Invoice.findById(invoiceId);

  const link = center.centerName.split(" ")[0] === "Surat" ? "bit.ly/4kXqoYu" : center.centerName.split(" ")[0] === "Vadodara" ? "https://bit.ly/4nizdh5" : center.centerName.split(" ")[0] === "Bhopal" ? "https://bit.ly/4lsZd83" : "bit.ly/4kXqoYu"

  if (invoice.createdAt.getTime() !== invoice.updatedAt.getTime()) {
    console.log(`Invoice ${invoice._id} is an update, skipping WhatsApp message.`);
    return;
  }


  const payload = {
      apiKey: process.env.AISENSY_API_KEY,
      campaignName: "Patient Invoice Send1",  // ✅ Must match your campaign in Aisensy
      subCampaignName: patient._id.toString(), // ✅ Unique per message
      destination: `+91${patient.phoneNo}`,
      userName: "IR Clinic",
      templateParams: [
        patient.patientName,
        link
      ],
      source: "new-landing-page form",
      paramsFallbackValue: {
        FirstName: "user"
      },
       media: {
      url: `https://api.interventionalradiology.co.in/api/v1/invoices/getInvoiceUrl/${invoice._id}`,
      filename: `Invoice_${invoice.invoicePlan[0].receiptNo}.pdf`
      },
    //   media: [
    //   {
    //     type: "document",
    //    // url: `https://api.interventionalradiology.co.in/api/v1/invoices/getInvoiceUrl/${invoice._id}`,
    //    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    //    // filename: `Invoice_${invoice._id}.pdf`
    //     filename: "Dummy_Invoice.pdf"
    //   }
    // ]
    };

  try {
      const { data } = await axios.post("https://backend.aisensy.com/campaign/t1/api/v2", payload);
      //console.log("WhatsApp API Response:", data);
  } catch (err) {
      console.error("WhatsApp API Error:", err.response?.data || err.message);
  }
};



const sendWhatsApp = async (payload) => {
    try {
      const { data } = await axios.post("https://backend.aisensy.com/campaign/t1/api/v2", payload);
      //console.log("AISensy Response:", data);
    } catch (err) {
      console.error("AISensy Error:", err.response?.data || err.message);
    }
  };

  export const startWhatsAppReminderCron = async () => {
  cron.schedule("0 21 * * *", async () => {
    console.log("🔁 WhatsApp Cron Job Running @ 9:00 PM");
  
    const today = moment().startOf("day");
    const tomorrow = moment(today).add(1, "day");
  
    // === 1. Missed Appointments Reminder (today's, not completed or cancelled)
    const missedAppointments = await Appointment.find({
      start: {
        $gte: today.toDate(),
        $lt: moment(today).endOf("day").toDate()
      },
      status: "Scheduled",
    });
  
    for (const appt of missedAppointments) {
      const patient = await Patient.findById(appt.patientId);
      if (!patient) continue;
      let procedureSection = '';
    let enrichedProcedures = [];

    if (appt.reason && Array.isArray(appt.reason)) {
        enrichedProcedures = await Promise.all(
            appt.reason.map(async (rea) => {
                const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
                if (rea.value && isValidObjectId(rea.value)) {
                    const procedure = await Service.findById(rea.value);
                    if (procedure ) {
                        return {
                            name: procedure.serviceName || procedure.name || "Procedure",
                            link: `https://irclinicindia.com/procedures/${procedure.serviceUrl}` || ""
                        };
                    }
                }
                return null;
            })
        );
        enrichedProcedures = enrichedProcedures.filter(p => p);

    }

    if (enrichedProcedures.length > 0) {
        const procedureLines = enrichedProcedures.map(proc => {
          if (proc.link) {
            return `🔹 *${proc.name}*: ${proc.link}`;
          }
          return '';
        });
      
        // Join with commas instead of newlines
        procedureSection = '📖 To learn more about your procedures: ' + procedureLines.filter(Boolean).join(' | ');
      }
  
      const payload = {
        apiKey: process.env.AISENSY_API_KEY,
        campaignName: "Missing Appointments1",
        destination: `+91${patient.phoneNo}`,
        userName: "IR Clinic",
        templateParams: [
          patient.patientName,
          procedureSection.trim() || "https://irclinicindia.com/"
        ],
        source: "new-landing-page form",
        paramsFallbackValue: {
          FirstName: "user"
        }
      };
      await sendWhatsApp(payload);
    }
  
    // === 2. Follow-up Appointment Reminder (for tomorrow)
    const followups = await Appointment.find({
      start: {
        $gte: tomorrow.toDate(),
        $lt: moment(tomorrow).endOf("day").toDate()
      },
      isFollowUp: true
    });
  
    for (const appt of followups) {
      const [patient, doctor, center] = await Promise.all([
        Patient.findById(appt.patientId),
        Doctor.findById(appt.doctorId),
        Center.findById(appt.centerId),
      ]);
      if (!patient || !doctor || !center) continue;
  
      const apptDate = moment(appt.start).format("DD/MM/YYYY");
      let procedureSection = '';
      let enrichedProcedures = [];

    if (appt.reason && Array.isArray(appt.reason)) {
        enrichedProcedures = await Promise.all(
            appt.reason.map(async (rea) => {
                const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
                if (rea.value && isValidObjectId(rea.value)) {
                    const procedure = await Service.findById(rea.value);
                    if (procedure ) {
                        return {
                            name: procedure.serviceName || procedure.name || "Procedure",
                            link: `https://irclinicindia.com/procedures/${procedure.serviceUrl}` || ""
                        };
                    }
                }
                return null;
            })
        );
        enrichedProcedures = enrichedProcedures.filter(p => p);

    }

    if (enrichedProcedures.length > 0) {
        const procedureLines = enrichedProcedures.map(proc => {
          if (proc.link) {
            return `🔹 *${proc.name}*: ${proc.link}`;
          }
          return '';
        });
      
        // Join with commas instead of newlines
        procedureSection = '📖 To learn more about your procedures: ' + procedureLines.filter(Boolean).join(' | ');
      }
  
      const payload = {
        apiKey: process.env.AISENSY_API_KEY,
        campaignName: "Follow Up Appointments1",
        destination: `+91${patient.phoneNo}`,
        userName: "IR Clinic",
        templateParams: [
          patient.patientName,
          apptDate,
          `${doctor.firstName} ${doctor.lastName}`,
          center.centerAddress || "IR Clinic",
          procedureSection.trim() || "https://irclinicindia.com/"
        ],
        source: "new-landing-page form",
        paramsFallbackValue: {
          FirstName: "user"
        }
      };
      await sendWhatsApp(payload);
    }
  
   // === 3. Procedure Bookings Reminder (for tomorrow)
   const tomorrowStart = moment().add(1, 'day').startOf('day').toDate();
   const tomorrowEnd = moment().add(1, 'day').endOf('day').toDate();
 
  // Find appointments with procedurePlan where dateTime as a string is within tomorrow's range
  const procedureAppointments = await Appointment.find({
    "procedurePlan": {
      $elemMatch: {
        dateTime: {
          $gte: tomorrowStart.toISOString(),  // Convert to ISO string for comparison
          $lt: tomorrowEnd.toISOString()     // Convert to ISO string for comparison
        }
      }
    }
  });

for (const appt of procedureAppointments) {
  const [patient, doctor, center] = await Promise.all([
    Patient.findById(appt.patientId),
    Doctor.findById(appt.doctorId),
    Center.findById(appt.centerId),
  ]);
  if (!patient || !doctor || !center) continue;

  // 🔹 Get the first procedurePlan entry that matches tomorrow
  const matchingProcedure = appt.procedurePlan.find(p => {
    const dt = new Date(p.dateTime);
    return dt >= tomorrowStart && dt < tomorrowEnd;
  });
  if (!matchingProcedure) continue;

  const procedureDate = moment(matchingProcedure.dateTime).format("DD/MM/YYYY");
  const procedureTime = moment(matchingProcedure.dateTime).format("hh:mm A");
  const procedureName = matchingProcedure.procedureName || "Procedure";

  let procedureSection = '';
  let enrichedProcedures = [];

  if (appt.procedurePlan && Array.isArray(appt.procedurePlan)) {
    enrichedProcedures = await Promise.all(
      appt.procedurePlan.map(async (plan) => {
        const isValidObjectId = mongoose.Types.ObjectId.isValid(plan.value);
        if (plan.value && isValidObjectId) {
           const procedure = await Procedure.findById(rea.value);
                    if (procedure ) {
                        return {
                            name: procedure.procedureName || procedure.name || "Procedure",
                            link: procedure.procedureUrl || ""
                        };
                    }
        }
        return null;
      })
    );
    enrichedProcedures = enrichedProcedures.filter(p => p);
  }
  

  if (enrichedProcedures.length > 0) {
    const procedureLines = enrichedProcedures.map(proc => {
      if (proc.link) {
        return `🔹 *${proc.name}*: ${proc.link}`;
      }
      return '';
    });

    procedureSection = '📖 To learn more about your procedures: ' + procedureLines.filter(Boolean).join(' | ');
  }

  const payload = {
    apiKey: process.env.AISENSY_API_KEY,
    campaignName: "Procedure Plan Appointments2",
    destination: `+91${patient.phoneNo}`,
    userName: "IR Clinic",
    templateParams: [
      patient.patientName,
      procedureDate,
      procedureTime,
      procedureName,
      `${doctor.firstName} ${doctor.lastName}`,
      center.centerAddress || "IR Clinic",
      procedureSection.trim() || "https://irclinicindia.com/"
    ],
    source: "new-landing-page form",
    paramsFallbackValue: {
      FirstName: "user"
    }
  };

  await sendWhatsApp(payload);
}
  
    console.log("✅ WhatsApp Cron Completed");
  });
}


export const saveAppointmentData = async (req, res) => {
  try {
    const {
      isActive,
      invoicePlan,
      estimatePlan,
      sections,
      creationReportDate,
      description,
      impression,
      advice,
      followup,
      selectedDate,
      investigations,
      progressValues,
      editingAppointment,
      currentAppointment,
      isEditingInvoice,
      isEditingCurrentAppointmentInvoice,
      isEditingEstimate,
      isEditingCurrentAppointmentEstimate,
      isEditingReport,
      currentReportIndex,
      isEditingInvestigationReport,
      currentInvestigationReportIndex,
      isEditingProgressNotes,
      currentProgressNoteIndex,
      creationDate,
      isEditingProcedure,
      centerId,
      userId
    } = req.body;

    let newInvoiceId = null;
    let newEstimateId = null;
    let appointmentToUpdate =
      isEditingInvoice || isEditingEstimate || isEditingReport ||
      isEditingProgressNotes || isEditingProcedure
        ? editingAppointment
        : currentAppointment;


    // ------------------------------------------------------------
    // 1️⃣ INVOICE TAB
    // ------------------------------------------------------------
    if (isActive === 4 && invoicePlan.length > 0) {

      await handleStockouts(
        invoicePlan,
        centerId,
        appointmentToUpdate,
        isEditingInvoice,
        isEditingCurrentAppointmentInvoice
      );

      let invoiceResponse;
      if (isEditingInvoice || isEditingCurrentAppointmentInvoice) {
        invoiceResponse = await Invoice.findByIdAndUpdate(
          req.body.editingInvoiceId,
          { invoicePlan, centerId, userId },
          { new: true }
        );
      } else {
        invoiceResponse = await Invoice.create({
          invoicePlan,
          appointmentId: appointmentToUpdate._id,
          centerId,
          userId
        });
      }

      newInvoiceId = invoiceResponse._id;

      let updatedInvoiceIds = Array.isArray(appointmentToUpdate.invoiceId)
        ? [...appointmentToUpdate.invoiceId]
        : appointmentToUpdate.invoiceId
          ? [appointmentToUpdate.invoiceId]
          : [];

      if (!isEditingInvoice) updatedInvoiceIds.push(newInvoiceId);

      await Appointment.findByIdAndUpdate(
        appointmentToUpdate._id,
        { invoiceId: updatedInvoiceIds },
        { new: true }
      );

      // ------------------------------------------------------------
      // 🔔 SEND WHATSAPP FOR NEW INVOICE
      // ------------------------------------------------------------
      const patient = await Patient.findById(appointmentToUpdate.patientId);
      const center = await Center.findById(centerId);

      if (!isEditingInvoice) {
        await sendPatientInvoice(patient, newInvoiceId, center);
      }
    }


    // ------------------------------------------------------------
    // 2️⃣ REPORT TAB
    // ------------------------------------------------------------
    let reportsChanged = false;
    let aptReports = [];
    if (isActive === 2) {
      let reports = [...(appointmentToUpdate.reports || [])];

      if (isEditingReport) {
        reports[currentReportIndex] = {
          creationReportDate,
          description,
          impression,
          advice,
          followup
        };
      } else {
        reports.push({
          creationReportDate,
          description,
          impression,
          advice,
          followup
        });
      }

      await Appointment.findByIdAndUpdate(
        appointmentToUpdate._id,
        { reports },
        { new: true }
      );

      reportsChanged = true;
      aptReports = reports;
    }


    // ------------------------------------------------------------
    // 3️⃣ INVESTIGATION TAB
    // ------------------------------------------------------------
    if (isActive === 5) {
      let investigationReports = [...(appointmentToUpdate.investigationReports || [])];

      if (isEditingInvestigationReport) {
        investigationReports[currentInvestigationReportIndex] = { selectedDate, investigations };
      } else {
        investigationReports.push({ selectedDate, investigations });
      }

      await Appointment.findByIdAndUpdate(
        appointmentToUpdate._id,
        { investigationReports },
        { new: true }
      );
    }


    // ------------------------------------------------------------
    // 4️⃣ PROGRESS NOTES TAB
    // ------------------------------------------------------------
    if (isActive === 6) {
      let progressNotes = [...(appointmentToUpdate.progressNotes || [])];

      if (isEditingProgressNotes) {
        progressNotes[currentProgressNoteIndex] = {
          creationDate: creationDate,
          progressNote: progressValues
        };
      } else {
        progressNotes.push({
          creationDate: creationDate,
          progressNote: progressValues
        });
      }

      await Appointment.findByIdAndUpdate(
        appointmentToUpdate._id,
        { progressNotes },
        { new: true }
      );
    }


    // ------------------------------------------------------------
    // 5️⃣ ESTIMATE TAB
    // ------------------------------------------------------------
    if (isActive === 7 && estimatePlan.length > 0) {

      await handleStockouts(
        estimatePlan,
        centerId,
        appointmentToUpdate,
        isEditingEstimate,
        isEditingCurrentAppointmentEstimate
      );

      let estimateResponse;
      if (isEditingEstimate) {
        estimateResponse = await Estimate.findByIdAndUpdate(
          req.body.editingEstimateId,
          { estimatePlan, centerId },
          { new: true }
        );
      } else if (isEditingCurrentAppointmentEstimate) {
        estimateResponse = await Estimate.findByIdAndUpdate(
          appointmentToUpdate.estimateId,
          { estimatePlan, centerId },
          { new: true }
        );
      } else {
        estimateResponse = await Estimate.create({
          estimatePlan,
          appointmentId: appointmentToUpdate._id,
          centerId,
          followups: [
            {
              followStatus: "Pending",
              followupMessage: "Pending",
              updatedDate: new Date()
            }
          ]
        });
      }

      newEstimateId = estimateResponse._id;

      await Appointment.findByIdAndUpdate(
        appointmentToUpdate._id,
        { estimateId: newEstimateId },
        { new: true }
      );
    }


    // ------------------------------------------------------------
    // 6️⃣ PROCEDURE TAB
    // ------------------------------------------------------------
    if (isActive === 3) {
      await Appointment.findByIdAndUpdate(
        appointmentToUpdate._id,
        { procedurePlan: sections },
        { new: true }
      );
    }


    // ------------------------------------------------------------
    // 🔔 WHATSAPP AFTER REPORT UPDATE (Impressions)
    // ------------------------------------------------------------
    if (reportsChanged) {
      const patient = await Patient.findById(appointmentToUpdate.patientId);

      if (patient?.reference) {
        await sendRefAppointmentImpression(patient, aptReports);
      }
    }


    // ------------------------------------------------------------
    // 🔔 SOCKET EVENTS (same as updateAppointment)
    // ------------------------------------------------------------
    io.emit("appointmentAddUpdate", { success: true });

    if (appointmentToUpdate.appointmentType === "OPD") {
      io.emit("appointmentStatusUpdated", appointmentToUpdate);
    }

    const updatedAppointmentFinal = await Appointment.findById(appointmentToUpdate._id);


    return res.json({
      success: true,
      invoiceId: newInvoiceId,
      estimateId: newEstimateId,
      appointment:updatedAppointmentFinal,
      message: "Appointment data saved successfully with WhatsApp notifications."
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Error" });
  }
};

async function handleStockouts(plan, centerId, appointment, isEditing, isEditingCurrent) {
  for (const procedure of plan || []) {
    for (const inventory of procedure.usedInventories || []) {
      for (const selectedStockItem of inventory.selectedStock || []) {

        const stockoutData = {
          vendorId: selectedStockItem.stock.vendorId,
          inventoryId: selectedStockItem.stock.inventoryId,
          totalStock: selectedStockItem.stockOut.length,
          others: selectedStockItem.stockOut,
          centerId,
          appointmentId: appointment._id,
          appointmentType: appointment.appointmentType,
          hospitalId: procedure?.hospital?.id || null
        };

        let stockoutDoc;

        // ---------------------------------------------
        // CREATE or UPDATE STOCKOUT RECORD
        // ---------------------------------------------
        if (!isEditing && !isEditingCurrent) {
          // CREATE
          stockoutDoc = await Stockout.create(stockoutData);

        } else {
          // UPDATE
          if (selectedStockItem.stockOutId) {
            stockoutDoc = await Stockout.findByIdAndUpdate(
              selectedStockItem.stockOutId,
              stockoutData,
              { new: true }
            );
          } else {
            stockoutDoc = await Stockout.create(stockoutData);
          }
        }

        // ---------------------------------------------
        // UPDATE STOCKIN (remaining stock after stockout)
        // ---------------------------------------------
        let filteredOthers = selectedStockItem.stock?.others || [];

        for (const stockOutItem of selectedStockItem.stockOut || []) {
          filteredOthers = filteredOthers.filter(
            other => other.id !== stockOutItem.stock.id
          );
        }

        const stockinUpdate = {
          vendorId: selectedStockItem.stock.vendorId,
          inventoryId: selectedStockItem.stock.inventoryId,
          totalStock: filteredOthers.length,
          others: filteredOthers,
          centerId
        };

        await Stockin.findByIdAndUpdate(
          selectedStockItem.stock._id,
          stockinUpdate,
          { new: true }
        );
      }
    }
  }
}

export const updateConsentImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { consentImage } = req.body;

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // -------- IMAGE COMPRESSION (500 KB max) --------
    const compressImage = async (base64Image) => {
      const MAX_SIZE = 500 * 1024; // 500 KB

      const base64Data = base64Image.split(";base64,").pop();
      let buffer = Buffer.from(base64Data, "base64");

      let quality = 85;

      while (buffer.length > MAX_SIZE && quality >= 60) {
        buffer = await sharp(buffer)
          .resize(1200, 1200, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({
            quality,
            mozjpeg: true,
            chromaSubsampling: "4:4:4",
          })
          .toBuffer();

        quality -= 5;
      }

      return `data:image/jpeg;base64,${buffer.toString("base64")}`;
    };

    // -------- HANDLE UPDATE / REMOVE --------
    if (consentImage === null) {
      // ✅ Remove image
      appointment.consentImage = null;
    } else if (consentImage) {
      // ✅ Compress & update image
      appointment.consentImage = await compressImage(consentImage);
    } else {
      // ❌ Nothing to update
      return res.status(400).json({
        success: false,
        message: "No consent image provided",
      });
    }

    await appointment.save();

    io.emit("appointmentAddUpdate", { success: true });

    return res.status(200).json({
      success: true,
      appointment,
    });
  } catch (error) {
    console.error("Error updating consent image:", error);
    return res.status(400).json({
      success: false,
      message: "Failed to update consent image",
    });
  }
};


export const getConsentImage = async (req, res) => {
    try {
        const aptId = req.params.id;
        const consent = await Appointment.findById(aptId).select('consentImage');
        if (!consent) return res.status(404).json({ message: "Consent not found!", success: false });
        const matches = consent.consentImage.match(/^data:(.+);base64,(.+)$/);
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
        res.status(500).json({ message: 'Failed to fetch consent image', success: false });
    }
};

export const sendPatientInvoiceWhatsapp = async (req, res) => {
  const { patientId, invoiceId, centerId,  } = req.body;
  const patient = await Patient.findById(patientId);
  const center = await Center.findById(centerId);

  const invoice = await Invoice.findById(invoiceId);

  const link = center.centerName.split(" ")[0] === "Surat" ? "bit.ly/4kXqoYu" : center.centerName.split(" ")[0] === "Vadodara" ? "https://bit.ly/4nizdh5" : center.centerName.split(" ")[0] === "Bhopal" ? "https://bit.ly/4lsZd83" : "bit.ly/4kXqoYu"

  const payload = {
      apiKey: process.env.AISENSY_API_KEY,
      campaignName: "Patient Invoice Send1",  // ✅ Must match your campaign in Aisensy
      subCampaignName: patient._id.toString(), // ✅ Unique per message
      destination: `+91${patient.phoneNo}`,
      userName: "IR Clinic",
      templateParams: [
        patient.patientName,
        link
      ],
      source: "new-landing-page form",
      paramsFallbackValue: {
        FirstName: "user"
      },
       media: {
      url: `https://api.interventionalradiology.co.in/api/v1/invoices/getInvoiceUrl/${invoice._id}?v=${Date.now()}`,
      filename: `Invoice_${invoice.invoicePlan[0].receiptNo}_${Date.now()}.pdf`
      },
    //   media: [
    //   {
    //     type: "document",
    //    // url: `https://api.interventionalradiology.co.in/api/v1/invoices/getInvoiceUrl/${invoice._id}`,
    //    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    //    // filename: `Invoice_${invoice._id}.pdf`
    //     filename: "Dummy_Invoice.pdf"
    //   }
    // ]
    };

  try {
      const { data } = await axios.post("https://backend.aisensy.com/campaign/t1/api/v2", payload);
      //console.log("WhatsApp API Response:", data);
      res.status(201).json({ data, success: true });
  } catch (err) {
      console.error("WhatsApp API Error:", err.response?.data || err.message);
  }
};


