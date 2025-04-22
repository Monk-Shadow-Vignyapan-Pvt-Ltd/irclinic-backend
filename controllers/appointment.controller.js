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
        const { patientId, appointmentType, title, doctorId, centerId, start, end, reason, reports, procedurePlan, investigationReports, progressNotes, invoiceId, estimateId, isCancelled, cancelby, cancelReason, userId, status, isFollowUp } = req.body;

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
            reports, procedurePlan, investigationReports, progressNotes, invoiceId, estimateId,
            isCancelled, cancelby, cancelReason,
            userId: userId || null,
            status: status || "Scheduled",
            isFollowUp
        });

        await appointment.save();
        io.emit("appointmentAddUpdate",  { success: true } );
        // Fetch users who should receive notifications
        if(appointmentType === 'Outside'){
            const firebasetokens = await FirebaseToken.find();
            const users = await User.find();
            const filteredUsers = users.filter(user => user.role === "Super Admin");
    
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
                                                            input: "$notifications",
                                                            as: "notif",
                                                            cond: { $gte: [{ $toDate: "$$notif.date" }, sevenDaysAgo] } // Convert date if needed
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
            await sendAppointmentConfirmation(appointment,patient, doctor, center);
        }
       

        res.status(201).json({ appointment, success: true });
    } catch (error) {
        console.error('Error adding appointment:', error);
        res.status(500).json({ message: 'Failed to add appointment', success: false });
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
                if (appointment.invoiceId) {
                    const invoice = await Invoice.findOne({ _id: appointment.invoiceId });
                    const invoicePlan = invoice.invoicePlan;
                    return { ...appointment.toObject(), invoicePlan }; // Convert Mongoose document to plain object
                } else if (appointment.estimateId) {
                    const estimate = await Estimate.findOne({ _id: appointment.estimateId });
                    const estimatePlan = estimate.estimatePlan;
                    return { ...appointment.toObject(), estimatePlan }; // Convert Mongoose document to plain object
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
            checkInTime,checkOutTime
        };

        const appointment = await Appointment.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found', success: false });
        }

        io.emit("appointmentAddUpdate",  { success: true }  );

        if (appointmentType === "OPD") {
            
            io.emit("appointmentStatusUpdated",  appointment );
        }
        
        // Fetch users who should receive notifications
        if(appointmentType === 'Outside'){
        const firebasetokens = await FirebaseToken.find();
        const users = await User.find();
        const filteredUsers = users.filter(user => user.role === "Super Admin");

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
                                                        input: "$notifications",
                                                        as: "notif",
                                                        cond: { $gte: [{ $toDate: "$$notif.date" }, sevenDaysAgo] } // Convert date if needed
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

const sendAppointmentConfirmation = async (appointment, patient, doctor, center) => {
    const now = moment();  // Get current time in the local timezone
    const appointmentDate = moment(appointment.start);

    if (appointmentDate.isBefore(now)) {
        console.log("Appointment is not in the future. WhatsApp message skipped.");
        return;
    }
    

    // Format date: DD/MM/YYYY
    const formattedDate = appointmentDate.format('DD/MM/YYYY');

    // Format time: hh:mm AM/PM
    const formattedTime = appointmentDate.format('hh:mm A');


    let procedureSection = '';
    let enrichedProcedures = [];

    if (appointment.reason && Array.isArray(appointment.reason)) {
        enrichedProcedures = await Promise.all(
            appointment.reason.map(async (rea) => {
                const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
                if (rea.value && isValidObjectId(rea.value)) {
                    const procedure = await Procedure.findById(rea.value);
                    if (procedure && procedure.isProcedure) {
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
      
        // Join with commas instead of newlines
        procedureSection = '📖 To learn more about your procedures: ' + procedureLines.filter(Boolean).join(' | ');
      }

    const payload = {
        apiKey: process.env.AISENSY_API_KEY,
        campaignName: "Appointment Confirmation",  // ✅ Must match your campaign in Aisensy
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
                    const procedure = await Procedure.findById(rea.value);
                    if (procedure && procedure.isProcedure) {
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
      
        // Join with commas instead of newlines
        procedureSection = '📖 To learn more about your procedures: ' + procedureLines.filter(Boolean).join(' | ');
      }
  
      const payload = {
        apiKey: process.env.AISENSY_API_KEY,
        campaignName: "Missing Appointments",
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
                    const procedure = await Procedure.findById(rea.value);
                    if (procedure && procedure.isProcedure) {
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
          const procedure = await Procedure.findById(plan.value);
          if (procedure && procedure.isProcedure) {
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
