import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["meta", "google"],
      trim: true,
    },
    leadId: {
      type: String,
      required: true,
      trim: true,
    },
    pageId: {
      type: String,
      required: false,
      trim: true,
    },
    formId: {
      type: String,
      required: false,
      trim: true,
    },
    adId: {
      type: String,
      required: false,
      trim: true,
    },
    campaignId: {
      type: String,
      required: false,
      trim: true,
    },
    webhookSource: {
      type: String,
      required: false,
      trim: true,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
    leadDetails: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    normalizedLeadData: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    followups: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

leadSchema.index({ type: 1, leadId: 1 }, { unique: true });

export const Lead = mongoose.model("Lead", leadSchema);
