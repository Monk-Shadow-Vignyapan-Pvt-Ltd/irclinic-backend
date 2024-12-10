// models/Doctor.js
import mongoose from "mongoose";

const patientSchema = new mongoose.Schema({
    patientName: { type: String, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Others'], required: true },
    phoneNo: { type: String, required: true },
    age: { type: String, required: true },
    address: { type: String, required: true },
    patientType: { type: String, required: true },
    reference: { type: String, required: false },
    centerId:{
        type:mongoose.Schema.Types.ObjectId,
        required:false
      },
    state:{
        type: String, required: false 
    },
    city:{
        type: String, required: false
    },
    caseId:{
        type: String, required: true
    },
    userId:{
        type: mongoose.Schema.Types.ObjectId, 
          required:false
      }
}, { timestamps: true });

export const Patient = mongoose.model("Patient", patientSchema);
