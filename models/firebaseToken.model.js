import mongoose from "mongoose";

const firebaseTokenSchema = new mongoose.Schema(
  {
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
    webToken: {
      type: String,
      required: false,
    },
    mobileToken: {
        type: String,
        required: false,
      },
    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    
  },
  { timestamps: true }
);

export const FirebaseToken = mongoose.model("FirebaseToken", firebaseTokenSchema);
