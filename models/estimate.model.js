import mongoose from "mongoose";

const estimateSchema = new mongoose.Schema(
  {
    estimatePlan: { type: mongoose.Schema.Types.Mixed, required: true },
    appointmentId: {
          type: mongoose.Schema.Types.ObjectId,
          required: false,
        },
    patientId: {
          type: mongoose.Schema.Types.ObjectId,
          required: false,
        },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    centerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
      },
    followups: { type: mongoose.Schema.Types.Mixed, required: false },
  },
  { timestamps: true }
);

export const Estimate = mongoose.model("Estimate", estimateSchema);
