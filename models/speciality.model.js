import mongoose from "mongoose";

const specialitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    
  },
  { timestamps: true }
);

export const Speciality = mongoose.model("Speciality", specialitySchema);
