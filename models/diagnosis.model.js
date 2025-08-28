import mongoose from "mongoose";

const diagnosisSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    
  },
  { timestamps: true }
);

export const Diagnosis = mongoose.model("Diagnosis", diagnosisSchema);
