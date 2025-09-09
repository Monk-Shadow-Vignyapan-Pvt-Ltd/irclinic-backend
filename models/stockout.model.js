import mongoose from "mongoose";

const stockoutSchema = new mongoose.Schema({
    vendorId: { type: mongoose.Schema.Types.ObjectId,ref: "Vendor", required: true },
    inventoryId: { type: mongoose.Schema.Types.ObjectId,ref: "Inventory", required: true },
    totalStock: { type: Number, required: true },
    appointmentType: {
      type: String,
      required: true,
    },
    hospitalId:{
      type:mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required:false
    },
    // stockinType: { type: String, required: true },
    // lotNo:{ type: String, required: true },
    // expiryDate:{ type: Date,  default: null, },
    others: { type: mongoose.Schema.Types.Mixed, required: false },
    invoiceId: { type: mongoose.Schema.Types.Mixed, required: false },
    appointmentId: { type: mongoose.Schema.Types.ObjectId,ref: "Appointment", required: false },
    centerId:{
        type:mongoose.Schema.Types.ObjectId,
        required:true
      },
   
}, { timestamps: true });

export const Stockout = mongoose.model("Stockout", stockoutSchema);
