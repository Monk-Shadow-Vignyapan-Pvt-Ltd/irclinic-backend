// models/Doctor.js
import mongoose from "mongoose";


const printSchema = new mongoose.Schema({
    leftSignature: {
        type: String,
        required: false,
      },
    centerId:{
            type:mongoose.Schema.Types.ObjectId,
            required:false
          },

    
}, { timestamps: true });

export const Print = mongoose.model("Print", printSchema);
