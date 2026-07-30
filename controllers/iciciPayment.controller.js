import axios from "axios";
import crypto from "crypto";
import {IciciPayment} from "../models/iciciPayment.model.js";
import { Appointment } from '../models/appointment.model.js'; 
import { CaseCounter } from '../models/caseCounter.model.js';
import { Center } from '../models/center.model.js';
import { Patient } from '../models/patient.model.js';
import { Doctor } from '../models/doctor.model.js';
import { Service } from '../models/service.model.js';
import moment from "moment";
import mongoose from "mongoose";
import { io } from "../index.js";
import dotenv from "dotenv";
import { createGoogleMeet } from '../services/googleMeet.service.js';
dotenv.config();

export const initiateIciciPayment = async (req, res) => {
  try {
    const {
      amount,
      customerName,
      customerMobileNo,
      appointmentData,
    } = req.body;

    // VALIDATION
    if (!amount || !customerName || !customerMobileNo) {
      return res.status(400).json({
        success: false,
        message: "Please enter all required fields",
      });
    }

    const ICICI_URL =
      "https://pgpay.icicibank.com/pg/api/v2/initiateSale";

    const SECRET_KEY =
      process.env.PGPAY_SECRET_KEY;

    // YYYYMMDDHHmmss
    const now = new Date();

    const txnDate =
      now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0") +
      String(now.getHours()).padStart(2, "0") +
      String(now.getMinutes()).padStart(2, "0") +
      String(now.getSeconds()).padStart(2, "0");

    const merchantTxnNo = Date.now().toString();

    const payload = {
      merchantId: "100000000484660",
      aggregatorID: "100000000484659",
      merchantTxnNo,
      amount: Number(amount).toFixed(2),
      currencyCode: "356",
      payType: "0",
      transactionType: "SALE",

      // Change this to your callback URL
      returnURL:
        `https://api.interventionalradiology.co.in/api/v1/auth/payment-callback?txn=${merchantTxnNo}`,

      txnDate,

      customerMobileNo,
      customerName,

      addlParam1: "ABCD",
      addlParam2: "111",
    };

    // HASH ORDER
    const sortedKeys = [
      "addlParam1",
      "addlParam2",
      "aggregatorID",
      "amount",
      "currencyCode",
      "customerMobileNo",
      "customerName",
      "merchantId",
      "merchantTxnNo",
      "payType",
      "returnURL",
      "transactionType",
      "txnDate",
    ];

    let hashText = "";

    sortedKeys.forEach((key) => {
      if (
        payload[key] !== undefined &&
        payload[key] !== null &&
        payload[key] !== ""
      ) {
        hashText += payload[key];
      }
    });

    const secureHash = crypto
      .createHmac(
        "sha256",
        Buffer.from(SECRET_KEY.trim(), "utf8")
      )
      .update(hashText, "ascii")
      .digest("hex")
      .toLowerCase();

    payload.secureHash = secureHash;

    // SAVE INITIAL PAYMENT
    const paymentDoc = await IciciPayment.create({
      merchantTxnNo,
      amount,
      customerName,
      customerMobileNo,
      appointmentData,
      txnDate,
      secureHash,
      hashText,
      requestPayload: payload,
      status: "INITIATED",
    });

    try {
      // CALL ICICI
      const response = await axios.post(
        ICICI_URL,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      paymentDoc.iciciResponse = response.data;

      // Payment is only initiated here
      paymentDoc.status = "INITIATED";

      await paymentDoc.save();

      return res.status(200).json({
        success: true,
        paymentId: paymentDoc._id,
        merchantTxnNo,
        iciciResponse: response.data,
      });
    } catch (apiError) {
      paymentDoc.status = "FAILED";

      paymentDoc.errorResponse =
        apiError.response?.data || {
          message: apiError.message,
        };

      await paymentDoc.save();

      return res.status(500).json({
        success: false,
        error:
          apiError.response?.data ||
          apiError.message,
      });
    }
  } catch (err) {
    console.error(
      "ICICI ERROR:",
      err.response?.data || err.message
    );

    return res.status(500).json({
      success: false,
      error:
        err.response?.data || err.message,
    });
  }
};

export const checkIciciPaymentStatus = async (
  req,
  res
) => {
  try {
    const { merchantTxnNo } = req.body;

    if (!merchantTxnNo) {
      return res.status(400).json({
        success: false,
        message: "merchantTxnNo is required",
      });
    }

    // FIND PAYMENT
    const payment =
      await IciciPayment.findOne({
        merchantTxnNo,
      });

      let appointmentData = null;



    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const ICICI_STATUS_URL =
      "https://pgpay.icicibank.com/pg/api/command";

    const SECRET_KEY =
      process.env.PGPAY_SECRET_KEY;

    // STATUS PAYLOAD
    const payload = {
      merchantId: "100000000484660",

      aggregatorID: "100000000484659",

      merchantTxnNo,

      transactionType: "STATUS",

      originalTxnNo: merchantTxnNo,
    };

    /*
      HASH ORDER FOR STATUS API
      IMPORTANT:
      Use EXACT order provided by ICICI
    */

    const hashText =
      payload.aggregatorID +
      payload.merchantId +
      payload.merchantTxnNo +
      payload.originalTxnNo +
      payload.transactionType;

    // GENERATE HASH
    const secureHash = crypto
      .createHmac(
        "sha256",
        Buffer.from(SECRET_KEY.trim(), "utf8")
      )
      .update(hashText, "ascii")
      .digest("hex")
      .toLowerCase();

    payload.secureHash = secureHash;

    // ICICI STATUS API CALL
    const response = await axios.post(
      ICICI_STATUS_URL,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    // SAVE STATUS RESPONSE
    payment.statusCheckResponse =
      response.data;

    /*
      SUCCESS RESPONSE CODE MAY DIFFER
      CHECK YOUR ICICI DOC / RESPONSE
    */

      const iciciData = response.data;

        if (
        iciciData?.txnStatus === "SUC" ||
        iciciData?.responseCode === "000" ||
        iciciData?.txnResponseCode === "0000"
        ) {
        payment.status = "SUCCESS";
        const alreadyCreated =
      await Appointment.findOne({
         paymentId: payment._id
      });

      appointmentData = alreadyCreated;

   if (!alreadyCreated) {
  const { fullName, gender, center, age, appointmentDate, appointmentTime, patientPhoneNo,paymentAmount,isOnlineConsultation } = payment.appointmentData;
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
               let newcaseId;
                try {
                newcaseId = await generateCaseId(center, "OPD");
                } catch (error) {
                return res.status(400).json({ message: error.message, success: false });
                }

            // Create new patient
            patient = new Patient({
                patientName: fullName,
                gender,
                phoneNo: patientPhoneNo,
                age,
                patientType: "OPD",
                centerId: center,
                isOnline: true,
                caseId: newcaseId,
            });
            await patient.save();
        }

        // ✅ Find doctors
        const doctors = await Doctor.find({
             centerId: center, isPartner: false 
        });

        let doctor = null;
        if (doctors.length > 0) {
            const randomIndex = Math.floor(Math.random() * doctors.length);
            doctor = doctors[randomIndex];
        }

        if (!doctor) {
            return res.status(400).json({ message: "No doctor available", success: false });
        }

        
        const [year, month, day] = appointmentDate.split("-").map(Number);
        const [hours, minutes] = appointmentTime.split(":").map(Number);

        // ✅ Create directly (NO ISO conversion)
        const start = new Date(Date.UTC(year, month - 1, day, hours - 5, minutes - 30));
        const end = new Date(start.getTime() + 15 * 60000);

        if (isNaN(start.getTime())) {
          return res.status(400).json({ message: "Invalid time selected", success: false });
        }

        let finalMeetingLink = null;

        if (isOnlineConsultation) {
            const meet = await createGoogleMeet({
                title,
                start,
                end,
            });

            finalMeetingLink = meet.meetingLink;
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
            isOnline: true,
            isOnlineConsultation,meetingLink:finalMeetingLink,
            paymentId:payment._id,
            paymentStatus:"Paid",
            paymentAmount:iciciData.amount,
            paymentMode:iciciData.paymentMode
          });
          await appointment.save();

          appointmentData= appointment;

        io.emit("appointmentAddUpdate", { success: true });

        await sendAppointmentConfirmation(appointment, patient, doctor, selectedCenter);
   }
        } else if (
        iciciData?.txnStatus === "PENDING"
        ) {
        payment.status = "PENDING";
        } else {
        payment.status = "FAILED";
        }

    

    await payment.save();

    return res.status(200).json({
      success: true,
      paymentStatus: payment.status,
      iciciResponse: response.data,
      appointment:appointmentData
    });
  } catch (err) {
    console.log(
      "ICICI STATUS ERROR:",
      err?.response?.data || err.message
    );

    return res.status(500).json({
      success: false,
      error:
        err?.response?.data || err.message,
    });
  }
};

const getNextSequence = async (centerId, patientType, date) => {
  const counter = await CaseCounter.findOneAndUpdate(
    { centerId, patientType, date },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return counter.seq;
};


const generateCaseId = async (centerId, patientType) => {
  const center = await Center.findById(centerId);
  if (!center) throw new Error("Center not found");

  const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const formattedDate = istNow
    .toLocaleDateString("en-GB")
    .replace(/\//g, "");

  let stateCode, cityCode;

  if (patientType === "OPD") {
    stateCode = center.stateCode;
    cityCode = center.cityCode;
  } else {
    throw new Error("Invalid patient type");
  }

  const seq = await getNextSequence(centerId, patientType, formattedDate);
  const paddedSeq = seq.toString().padStart(7, "0");

  return patientType === "OPD"
    ? `${stateCode}-${cityCode}-${center.centerCode}-ON-${formattedDate}-${paddedSeq}`
    : `${stateCode}-${cityCode}-${center.centerCode}-O-${formattedDate}-${paddedSeq}`;
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