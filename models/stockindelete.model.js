import mongoose from "mongoose";

const stockindeleteSchema = new mongoose.Schema({
    stockinId:{ type: mongoose.Schema.Types.ObjectId,required: true },
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
      },
    deleteType: { type: String, required: false },
}, { timestamps: true });

export const Stockindelete = mongoose.model("Stockindelete", stockindeleteSchema);
