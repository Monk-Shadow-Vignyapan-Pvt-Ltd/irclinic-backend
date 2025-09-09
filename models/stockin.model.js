import mongoose from "mongoose";

const stockinSchema = new mongoose.Schema({
    vendorId: { type: mongoose.Schema.Types.ObjectId,ref: "Vendor", required: true },
    inventoryId: { type: mongoose.Schema.Types.ObjectId,ref: "Inventory", required: true },
    totalStock: { type: Number, required: true },
    // stockinType: { type: String, required: true },
    // lotNo:{ type: String, required: true },
    // expiryDate:{ type: Date,  default: null, },
    others: { type: mongoose.Schema.Types.Mixed, required: false },
    centerId:{
        type:mongoose.Schema.Types.ObjectId,
        required:true
      },
    userId:{
        type: mongoose.Schema.Types.ObjectId, 
          required:false
      }
}, { timestamps: true });

export const Stockin = mongoose.model("Stockin", stockinSchema);
