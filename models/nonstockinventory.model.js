import mongoose from "mongoose";

const nonStockInventorySchema = new mongoose.Schema(
  {
    inventoryName: {
      type: String,
      required: true,
    },
    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
  },
  { timestamps: true }
);

export const NonStockInventory = mongoose.model("NonStockInventory", nonStockInventorySchema);
