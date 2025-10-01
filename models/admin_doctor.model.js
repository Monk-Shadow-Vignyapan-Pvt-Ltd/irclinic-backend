import mongoose from "mongoose";

const adminDoctorSchema = new mongoose.Schema(
  {
    doctorName: { type: String, required: true, unique: true },
    doctorDescription: { type: String, required: true },
    doctorImage: {
      type: String, // Store image as base64 or use a URL reference
      required: true,
    },
    doctorPhone: {
      type: String, // Store image as base64 or use a URL reference
      required: true,
    },
    doctorEmail: {
      type: String, // Store image as base64 or use a URL reference
      required: true,
    },
    speciality: {
      type: mongoose.Schema.Types.Mixed, // Use Mixed for flexible structure (JSON-like object)
      required: false,
    },
    doctorDegree: {
      type: String, // Store image as base64 or use a URL reference
      required: false,
    },
    doctorTraining: {
      type: String, // Store image as base64 or use a URL reference
      required: false,
    },
    doctorUrl: { type: String, required: true, unique: true },
    fbUrl: { type: String, required: false },
    instaUrl: { type: String, required: true },
    linkedinUrl: { type: String, required: true },
    oldUrls: {
      type: mongoose.Schema.Types.Mixed, // Use Mixed for flexible structure (JSON-like object)
      required: false,
    },
    seoTitle: {
      type: String,
      required: false,
    },
    seoDescription: {
      type: String,
      required: false,
    },
    schema: {
      type: String, // Store image as base64 or use a URL reference
      required: false,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
  },
  { timestamps: true }
);

export const AdminDoctor = mongoose.model("AdminDoctor", adminDoctorSchema);
