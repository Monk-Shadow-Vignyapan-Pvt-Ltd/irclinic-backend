import mongoose from "mongoose";

const gallarySchema = new mongoose.Schema({
    others: {
        type: mongoose.Schema.Types.Mixed,  // Use Mixed for flexible structure (JSON-like object)
        required: false
    },
     gallaryEnabled:{
        type:Boolean,
        required:true
     },
     userId:{
        type: mongoose.Schema.Types.ObjectId, 
          required:false
      }

}, { timestamps: true });

export const Gallary = mongoose.model("Gallary", gallarySchema);
