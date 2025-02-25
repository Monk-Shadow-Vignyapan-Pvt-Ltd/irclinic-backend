// models/Doctor.js
import mongoose from "mongoose";

const citySchema = new mongoose.Schema({
    cityName: { type: String, required: true,unique: true,  },
    cityCode: { type: String, 
        required: true,
        unique: true, 
        minlength: 2, 
        maxlength: 3, 
        match: /^[A-Za-z]+$/ 
     },
    stateId:{type:mongoose.Schema.Types.ObjectId,required: true},
    userId:{
        type: mongoose.Schema.Types.ObjectId, 
          required:false
      },
    centerId: {
          type: mongoose.Schema.Types.ObjectId,
          required: false,
        },
}, { timestamps: true });

export const City = mongoose.model("City", citySchema);
