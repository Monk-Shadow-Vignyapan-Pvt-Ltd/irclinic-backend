// models/Doctor.js
import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Others'], required: true },
    phoneNo: { type: String, required: true },
    email: { type: String, required: true },
    company: { type: String, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },
    speciality: { type: mongoose.Schema.Types.Mixed, required: true },
    isPartner: { type: Boolean, default: false },
    centerId:{
        type:mongoose.Schema.Types.ObjectId,
        required:false
      },
    userId:{
        type: mongoose.Schema.Types.ObjectId, 
          required:false
      }
}, { timestamps: true });

export const Doctor = mongoose.model("Doctor", doctorSchema);
