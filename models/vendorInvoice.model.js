import mongoose from "mongoose";

const vendorInvoiceSchema = new mongoose.Schema(
  {
    invoiceImage: { type: mongoose.Schema.Types.Mixed, required: true },
    approveStatus: { type: String, required: true },
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    centerId: {
          type: mongoose.Schema.Types.ObjectId,
          required: false,
        },
  },
  { timestamps: true }
);

export const VendorInvoice = mongoose.model("VendorInvoice", vendorInvoiceSchema);
