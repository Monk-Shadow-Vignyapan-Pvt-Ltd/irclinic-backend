import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    invoicePlan: { type: mongoose.Schema.Types.Mixed, required: true },
    appointmentId: {
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

export const Invoice = mongoose.model("Invoice", invoiceSchema);
