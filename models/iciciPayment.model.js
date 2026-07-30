// models/IciciPayment.js

import mongoose from "mongoose";

const iciciPaymentSchema = new mongoose.Schema(
  {
    merchantTxnNo: {
      type: String,
      required: true,
      unique: true,
    },

    amount: Number,

    customerName: String,

    customerEmailID: String,

    customerMobileNo: String,

    txnDate: String,

    secureHash: String,

    hashText: String,

    requestPayload: {
      type: Object,
    },

    iciciResponse: {
      type: Object,
    },
    statusCheckResponse: {
        type: Object,
        },

    status: {
      type: String,
      enum: [
        "INITIATED",
        "SUCCESS",
        "FAILED",
        "PENDING",
      ],
      default: "INITIATED",
    },

    errorResponse: {
      type: Object,
    },

    appointmentData:{
      type: Object,
    }
  },
  {
    timestamps: true,
  }
);

export const IciciPayment = mongoose.model("IciciPayment", iciciPaymentSchema);