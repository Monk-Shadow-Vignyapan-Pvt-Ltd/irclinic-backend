// models/Doctor.js
import mongoose from "mongoose";

const centerSchema = new mongoose.Schema({
    centerName: { type: String, required: true },
    adminPhoneNo: { type: String, required: true },
    accountPhoneNo: { type: String, required: true },
    centerEmail: { type: String, required: true },
    centerAddress: { type: String, required: true },
    centerTiming: { type: String, required: false },
    centerOpenOn: { type: String, required: false },
    stateCode: { type: String, required: true },
    cityCode: { type: String, required: true },
    centerCode:{
        type: String, 
        required: true,
        unique: true, 
        minlength: 2, 
        maxlength: 3, 
        match: /^[A-Za-z]+$/ 
    },
    userId:{
        type: mongoose.Schema.Types.ObjectId, 
          required:false
      }
    
}, { timestamps: true });

export const Center = mongoose.model("Center", centerSchema);
