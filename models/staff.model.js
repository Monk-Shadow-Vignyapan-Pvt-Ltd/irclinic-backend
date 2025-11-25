// models/Doctor.js
import mongoose from "mongoose";

const staffSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Others'], required: true },
    phoneNo: { type: String, required: true },
    alterphoneNo: { type: String, required: false,},
    email: { type: String, required: false },
    clinicTime: { type: String, required: false },
    hospitalName: { type: String, required: false },
    sop: { type: String, required: false },
    address: { type: mongoose.Schema.Types.Mixed, required: false },
    state: { type: String, required: false },
    city: { type: String, required: false },
    occupation: { type: mongoose.Schema.Types.Mixed, required: false },
    inIR: { type: Boolean, default: false },
    centerId:{
        type:mongoose.Schema.Types.ObjectId,
        required:false
      },
    userId:{
        type: mongoose.Schema.Types.ObjectId, 
          required:false
      }
}, { timestamps: true });

export const Staff = mongoose.model("Staff", staffSchema);
