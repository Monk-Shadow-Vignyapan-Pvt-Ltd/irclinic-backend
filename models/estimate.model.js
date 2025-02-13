import mongoose from "mongoose";

const estimateSchema = new mongoose.Schema(
  {
    estimatePlan: { type: mongoose.Schema.Types.Mixed, required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    centerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
      },
  },
  { timestamps: true }
);

export const Estimate = mongoose.model("Estimate", estimateSchema);
