import mongoose from "mongoose";

const symptomSchema = new mongoose.Schema({
  symptomName: { type: String, required: true },
  symptomDescription: { type: String, required: true },
  symptomURL: { type: String, required: true, unique: true },
  oldUrls: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },
  seoTitle: {
    type: String,
    required: false,
  },
  seoDescription: {
    type: String,
    required: false,
  },
  schema: {
      type: String, // Store image as base64 or use a URL reference
      required: false,
    },
  rank:{
        type: Number, // Store image as base64 or use a URL reference
        required: false,    
      },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  }

}, { timestamps: true });

export const Symptom = mongoose.model("Symptom", symptomSchema);
