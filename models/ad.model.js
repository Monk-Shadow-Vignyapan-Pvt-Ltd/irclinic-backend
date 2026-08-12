import mongoose from "mongoose";

const adSchema = new mongoose.Schema(
  {
    
    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    
    patientName:{
        type: String,
        required: true,
    },
    patientEmail:{  
        type: String,
        required: false,        
    },
    patientPhone:{
        type: String,
        required: true,     
    },
    
    paymentId: String,
    paymentStatus:String,
    paymentAmount:Number,
    paymentMode:String,
    merchantTxnNo: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

export const Ad = mongoose.model("Ad", adSchema);
