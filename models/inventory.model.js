import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
  {
    inventoryType: { type: String, required: true },
    inventoryName: { type: String, required: true },
    brandName: { type: String, required: false },
    instrumentType: { type: String, required: false },
    ignoreStockLevel: { type: Boolean, required: false, default: false },
    stockLevel: {
      type: String,
      validate: {
        validator: function (value) {
          // If ignoreStockLevel is true, stockLevel is not required
          if (this.ignoreStockLevel) return true;
          // Otherwise, stockLevel is required
          return value != null && value !== "";
        },
        message: "Stock level is required unless ignoreStockLevel is true.",
      },
    },
    unit: { type: String, required: false },
    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
  },
  { timestamps: true }
);

export const Inventory = mongoose.model("Inventory", inventorySchema);
