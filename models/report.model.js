import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
    reportTitle: { type: String, required: true },
    description: { type: String, required: false },
    impression: { type: String, required: false },
    advice: { type: String, required: false },
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
