import moment from "moment";
import { Counter } from "../models/counter.model.js";

export const generateReceiptNo = async (centerId) => {
  const today = moment().format("DDMMYYYY");

  const counter = await Counter.findOneAndUpdate(
    { centerId, date: today },
    { $inc: { seq: 1 } },
    { new: true, upsert: true } // 🔥 important
  );

  const prefix = `IR-${today}`;
  return `${prefix}-${counter.seq}`;
};