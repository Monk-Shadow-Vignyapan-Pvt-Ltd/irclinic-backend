// models/Doctor.js
import mongoose from "mongoose";

const hospitalSchema = new mongoose.Schema({
    hospitalName: { type: String, required: true },
    adminPhoneNo: { type: String, required: true },
    accountPhoneNo: { type: String, required: true },
    hospitalEmail: { type: String, required: true },
    hospitalAddress: { type: String, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },
    userId:{
        type: mongoose.Schema.Types.ObjectId, 
          required:false
      }
    
}, { timestamps: true });

export const Hospital = mongoose.model("Hospital", hospitalSchema);
