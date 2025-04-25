import mongoose from "mongoose";

const adminDoctorSearchSchema = new mongoose.Schema(
  {
    ranking: {
      type: mongoose.Schema.Types.Mixed, // Use Mixed for flexible structure (JSON-like object)
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
  },
  { timestamps: true }
);

export const AdminDoctorSearch = mongoose.model(
  "AdminDoctorSearch",
  adminDoctorSearchSchema
);
