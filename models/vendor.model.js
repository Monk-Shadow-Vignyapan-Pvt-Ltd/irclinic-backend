// models/Doctor.js
import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema({
    vendorName: { type: String, required: true },
    salesPhoneNo: { type: String, required: true },
    accountPhoneNo: { type: String, required: true },
    email: { type: String, required: true },
    company: { type: String, required: false },
    address:{type: String, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },
    isInstrumentVendor: { type: Boolean, required: true },
    isMedicineVendor: { type: Boolean, required: true },
    userId:{
        type: mongoose.Schema.Types.ObjectId, 
          required:false
      },
      centerId:{
        type: mongoose.Schema.Types.Mixed, 
          required:false
      }
}, { timestamps: true });

export const Vendor = mongoose.model("Vendor", vendorSchema);
