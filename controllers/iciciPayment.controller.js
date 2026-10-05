import axios from "axios";
import crypto from "crypto";
import {IciciPayment} from "../models/iciciPayment.model.js";
import { Ad } from '../models/ad.model.js';
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

     if (!appointmentData?._id) {
      return res.status(400).json({
        success: false,
        message: "Appointment ID is required",
      });
    }

    // CHECK APPOINTMENT
    const appointment = await Appointment.findById(
      appointmentData._id
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
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

     appointment.merchantTxnNo = merchantTxnNo;
    appointment.paymentStatus = "PENDING";
    appointment.paymentAmount = Number(amount);

    await appointment.save();

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
      let appointmentPaymentStatus = null;



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
  appointmentPaymentStatus = "SUCCESS";
}

// PENDING
else if (
  iciciData?.txnStatus === "PENDING"
) {
  payment.status = "PENDING";
  appointmentPaymentStatus = "PENDING";
}

// CANCELLED
else if (
  iciciData?.txnStatus === "CANCELLED" ||
  iciciData?.txnStatus === "CANCEL" ||
  iciciData?.responseCode === "999" // adjust if ICICI uses a specific cancel code
) {
  payment.status = "CANCELLED";
  appointmentPaymentStatus = "CANCELLED";
}

// FAILED
else {
  payment.status = "FAILED";
  appointmentPaymentStatus = "FAILED";
}

// Update payment first
await payment.save();

// Update Appointment payment status
if (payment.appointmentData?._id && appointmentPaymentStatus) {
  appointmentData =
        await Appointment.findByIdAndUpdate(
          payment.appointmentData._id,
          {
            $set: {
              paymentStatus: appointmentPaymentStatus,
              paymentId: payment._id,
              paymentAmount:
                iciciData?.amount || payment.amount,
              paymentMode:
                iciciData?.paymentMode || null,
            },
          },
          {
            new: true,
          }
        ).populate("patientId");

        if(appointmentPaymentStatus === "SUCCESS") {
          await sendOnlineConsultMeetingLink(appointmentData._id);
        }

}

if (appointmentData) {
      appointmentData = {
        ...appointmentData.toObject(),

        title:
          appointmentData.patientId?.patientName ||
          "Unnamed Patient",

        patientId:
          appointmentData.patientId?._id,

        patient:
          appointmentData.patientId,

        fromCamp:
          appointmentData.patientId?.fromCamp ||
          false,
      };
    }

    return res.status(200).json({
      success: true,
      paymentStatus: payment.status,
      iciciResponse: response.data,
      appointment:appointmentData,
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

const sendOnlineConsultMeetingLink = async (appointmentId) => {
  const appointment = await Appointment.findById(appointmentId);
    const patient = await Patient.findById(appointment.patientId);
    const doctor = await Doctor.findById(appointment.doctorId);
    const appointmentDate = moment.utc(appointment.start).add(5, 'hours').add(30, 'minutes');
  
    const formattedDate = appointmentDate.format('DD/MM/YYYY');
    const formattedTime = appointmentDate.format('hh:mm A');
    
  
    const payload = {
        
  
        whatsapp: {
          messages: [
            {
              from: `+919213009647`,
  
              to: `+91${patient.phoneNo}`,
  
              content: {
                type: "template",
  
                template: {
                  name: "online_consulatation_meeting_link",
  
                  language: {
                    policy: "deterministic",
                    code: "en"
                  },
  
                  components: [
                    {
                      "type": "header",
                      "parameters": [
                        { "type": "image", "image": { "link": "https://irclinicindia.com/social-share-image.jpg" } }
                      ]
                    },
                    {
                      type: "body",
  
                      parameters: [
                        {
                          type: "text",
                          text: patient.patientName
                        },
                        {
                          type: "text",
                          text: formattedDate
                        },
                        {
                          type: "text",
                          text: formattedTime
                        },
                        ,
                        {
                          type: "text",
                          text: `${doctor.firstName} ${doctor.lastName}`
                        },
                        {
                          type: "text",
                          text: appointment.meetingLink || "https://meet.google.com/"
                        }
                      ]
                    },
                    {
                  type: "button",
                  sub_type: "url",
                  index: "0",
  
                  parameters: [
                    {
                      type: "text",
                      text: appointment.meetingLink || "https://meet.google.com/"
                    }
                  ]
                }
                  ]
                }
              }
            }
          ]
        }
      };

    try {
        //const { data } = await axios.post("https://backend.aisensy.com/campaign/t1/api/v2", payload);
        //console.log("WhatsApp API Response:", data);

        const url =
  `https://${process.env.EXOTEL_API_KEY}:${process.env.EXOTEL_API_TOKEN}` +
  `@api.exotel.com/v2/accounts/irclinic1/messages`;

const response = await axios.post(url, payload, {
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json"
  },
});

// console.log("Exotel Status:", response.status);
// console.log("Exotel Response:", JSON.stringify(response.data, null, 2));
    } catch (err) {
        console.error("WhatsApp API Error:", err.response?.data || err.message);
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

export const initiateAdPayment = async (req, res) => {
  try {
    const {
      amount,
      customerName,
      customerMobileNo,
      adData,
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
        `https://api.interventionalradiology.co.in/api/v1/auth/adpayment-callback?txn=${merchantTxnNo}`,

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
      adData,
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

      await Ad.findByIdAndUpdate(adData._id, {
        paymentStatus: "Pending",
        paymentId: paymentDoc._id,
        paymentAmount:amount,
        merchantTxnNo:merchantTxnNo
      });

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

export const checkAdPaymentStatus = async (
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
        await Ad.findByIdAndUpdate(payment.adData._id, {
          paymentStatus: "Paid",
          paymentId: payment._id,
          paymentAmount:iciciData.amount,
          paymentMode:iciciData.paymentMode
        });
    
        } else if (
        iciciData?.txnStatus === "PENDING"
        ) {
        payment.status = "PENDING";
        } else {
        payment.status = "FAILED";
        await Ad.findByIdAndUpdate(payment.adData._id, {
          paymentStatus: "Failed",
          paymentId: payment._id,
          paymentAmount:iciciData.amount,
          paymentMode:iciciData.paymentMode
        }
        );
      }

    await payment.save();

    return res.status(200).json({
      success: true,
      paymentStatus: payment.status,
      iciciResponse: response.data,
      paymentInfo:payment
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