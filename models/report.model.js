import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
    reportTitle: { type: String, required: true },
    documentname: { type: String, required: true },
    description: { type: String, required: true },
    impression: { type: String, required: true },
    advice: { type: String, required: true },
    userId:{
        type: mongoose.Schema.Types.ObjectId, 
          required:false
      },
    centerId:{
        type: mongoose.Schema.Types.ObjectId, 
          required:false
    }
    
}, { timestamps: true });

export const Report = mongoose.model("Report", reportSchema);
