// models/Doctor.js
import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Others'], required: true },
    phoneNo: { type: String, required: true },
    alterphoneNo: { type: String, required: false,},
    email: { type: String, required: false },
    company: { type: String, required: false },
    state: { type: String, required: false },
    city: { type: String, required: false },
    speciality: { type: mongoose.Schema.Types.Mixed, required: false },
    isPartner: { type: Boolean, default: false },
    superDoctor: { type: Boolean, default: false },
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
