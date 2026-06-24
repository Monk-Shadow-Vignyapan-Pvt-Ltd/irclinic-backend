// models/Doctor.js
import mongoose from "mongoose";

const keywordSchema = new mongoose.Schema(
  {
    keywordName: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export const Keyword = mongoose.model("Keyword", keywordSchema);
