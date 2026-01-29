// models/CaseCounter.js
import mongoose from "mongoose";

const caseCounterSchema = new mongoose.Schema({
  centerId: { type: mongoose.Schema.Types.ObjectId, required: true },
  patientType: { type: String, required: true },
  date: { type: String, required: true }, // DDMMYYYY
  seq: { type: Number, default: 0 }
});

caseCounterSchema.index(
  { centerId: 1, patientType: 1, date: 1 },
  { unique: true }
);

export const CaseCounter = mongoose.model("CaseCounter", caseCounterSchema);
