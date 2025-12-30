// models/Doctor.js
import mongoose from "mongoose";

const patientSchema = new mongoose.Schema({
    patientName: { type: String, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Others'], required: true },
    phoneNo: { type: String, required: true},
    alterphoneNo: { type: String, required: false,},
    age: { type: String, required: false },
    address: { type: String, required: false },
    fromCamp: { type: Boolean, required: false },
    patientType: { type: String, required: true },
    reference: { type: mongoose.Schema.Types.Mixed, required: false },
    visitHistory: { type: mongoose.Schema.Types.Mixed, required: false },
    centerId:{
        type:mongoose.Schema.Types.ObjectId,
        required:true
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
    area: { type: mongoose.Schema.Types.Mixed, required: false },
    diagnosis: { type: mongoose.Schema.Types.Mixed, required: false },
    userId:{
        type: mongoose.Schema.Types.ObjectId, 
          required:false
      }
}, { timestamps: true });

patientSchema.index(
  { phoneNo: 1, centerId: 1 },
  { unique: true }
);

export const Patient = mongoose.model("Patient", patientSchema);
