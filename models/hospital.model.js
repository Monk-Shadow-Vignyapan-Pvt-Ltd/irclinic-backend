// models/Doctor.js
import mongoose from "mongoose";

const hospitalSchema = new mongoose.Schema({
    hospitalName: { type: String, required: true },
    adminPhoneNo: { type: String, required: true },
    accountPhoneNo: { type: String, required: true },
    hospitalEmail: { type: String, required: false },
    hospitalAddress: { type: String, required: false },
    state: { type: String, required: false },
    city: { type: String, required: false },
    userId:{
        type: mongoose.Schema.Types.ObjectId, 
          required:false
      },
    centerId: {
          type: mongoose.Schema.Types.ObjectId,
          required: false,
        },
    
}, { timestamps: true });

export const Hospital = mongoose.model("Hospital", hospitalSchema);
