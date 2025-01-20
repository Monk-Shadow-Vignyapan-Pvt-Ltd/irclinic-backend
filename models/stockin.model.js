import mongoose from "mongoose";

const stockinSchema = new mongoose.Schema({
    inventoryId: { type: mongoose.Schema.Types.ObjectId, required: true },
    totalStock: { type: Number, required: true },
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
