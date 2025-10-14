import mongoose from "mongoose";

const occupationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    
  },
  { timestamps: true }
);

export const Occupation = mongoose.model("Occupation", occupationSchema);
