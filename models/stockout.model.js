import mongoose from "mongoose";

const stockoutSchema = new mongoose.Schema({
    vendorId: { type: mongoose.Schema.Types.ObjectId, required: true },
    inventoryId: { type: mongoose.Schema.Types.ObjectId, required: true },
    totalStock: { type: Number, required: true },
    others: { type: mongoose.Schema.Types.Mixed, required: false },
    centerId:{
        type:mongoose.Schema.Types.ObjectId,
        required:true
      },
   
}, { timestamps: true });

export const Stockout = mongoose.model("Stockout", stockoutSchema);
