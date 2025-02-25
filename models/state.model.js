// models/Doctor.js
import mongoose from "mongoose";

const stateSchema = new mongoose.Schema({
    stateName: { type: String, required: true,unique: true,  },
    stateCode: { 
        type: String, 
        required: true,
        unique: true, 
        minlength: 2, 
        maxlength: 2, 
        match: /^[A-Za-z]+$/ // Ensures only alphabets are allowed
    },
    userId:{
        type: mongoose.Schema.Types.ObjectId, 
          required:false
      },
      centerId:{
        type: mongoose.Schema.Types.ObjectId, 
          required:false
      },

}, { timestamps: true });

export const State = mongoose.model("State", stateSchema);
