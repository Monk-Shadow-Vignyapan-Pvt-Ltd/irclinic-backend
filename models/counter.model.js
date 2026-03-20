// models/counter.model.js

import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  centerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  date: {
    type: String, // format: DDMMYYYY
    required: true
  },
  seq: {
    type: Number,
    default: 0
  }
});

counterSchema.index({ centerId: 1, date: 1 }, { unique: true });

export const Counter = mongoose.model("Counter", counterSchema);