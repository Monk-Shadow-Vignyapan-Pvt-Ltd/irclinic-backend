import mongoose from "mongoose";

const consentSchema = new mongoose.Schema(
  {
    consentTitle:{
        type: String,
        required: true,
    },
    consentNote: {
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

export const Consent = mongoose.model("Consent", consentSchema);
