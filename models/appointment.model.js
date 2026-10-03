import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref:"Patient"
    },
    appointmentType: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      ref:"Doctor"
    },
    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    start: {
      type: Date,
      required: true,
    },
    end: {
      type: Date,
      required: true,
    },
    reason:{
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    reports: { type: mongoose.Schema.Types.Mixed, required: false },
    procedurePlan: { type: mongoose.Schema.Types.Mixed, required: false },
    investigationReports : { type: mongoose.Schema.Types.Mixed, required: false },
    progressNotes : { type: mongoose.Schema.Types.Mixed, required: false },
    invoiceId: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    estimateId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    quicknoteId : {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    isCancelled:{
      type: Boolean,
      required: false,
    },
    cancelby:{
      type: String,
      required: false,
    },
    cancelReason:{
      type: String,
      required: false,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    status:{
      type: String,
      required: true,
      default:"Scheduled"
    },
    checkInTime: {
      type: Date,
      required: false,
    },
    checkOutTime: {
      type: Date,
      required: false,
    },
    isFollowUp:{
      type: Boolean,
      required: false,
    },
    isOnline:{
      type: Boolean,
      required: false,
    },
    isOnlineConsultation:{
      type: Boolean,
      required: false,
      default:false
    },
    meetingLink: {
        type: String,
        required: false,
    },
    googleMeet: {
  spaceName: {
    type: String,
    required: false,
  },

  meetingUri: {
    type: String,
    required: false,
  },

  calendarEventId: {
    type: String,
    required: false,
  },

  conferenceRecord: {
    type: String,
    required: false,
  },

  eventSubscription: {
    name: {
      type: String,
      required: false,
    },

    expirationTime: {
      type: Date,
      required: false,
    },
  },

  recording: {
    status: {
      type: String,

      enum: [
        "pending",
        "recording",
        "processing",
        "ready",
        "failed",
      ],

      default: "pending",
    },

    fileId: {
      type: String,
      required: false,
    },

    fileName: {
      type: String,
      required: false,
    },

    driveUrl: {
      type: String,
      required: false,
    },

    startTime: {
      type: Date,
      required: false,
    },

    endTime: {
      type: Date,
      required: false,
    },

    recordingName: {
      type: String,
      required: false,
    },

    processedAt: {
      type: Date,
      required: false,
    },

    error: {
      type: String,
      required: false,
    },
  },
},
    consentImage: {
        type: String, // Store image as base64 or use a URL reference
        required: false,
    },
    merchantTxnNo:String,
    paymentId: String,
    paymentStatus:String,
    paymentAmount:Number,
    paymentMode:String
  },
  { timestamps: true }
);

export const Appointment = mongoose.model("Appointment", appointmentSchema);
