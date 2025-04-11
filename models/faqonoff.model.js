import mongoose from "mongoose";

const faqOnOffSchema = new mongoose.Schema({
    faqEnabled:{
        type:Boolean,
        required:true,
        default: true,
     },
    
}, { timestamps: true });

export const FaqOnOff = mongoose.model("FaqOnOff", faqOnOffSchema);