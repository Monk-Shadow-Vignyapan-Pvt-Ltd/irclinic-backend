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
    consentImage: {
        type: String, // Store image as base64 or use a URL reference
        required: false,
    },
  },
  { timestamps: true }
);

export const Appointment = mongoose.model("Appointment", appointmentSchema);
