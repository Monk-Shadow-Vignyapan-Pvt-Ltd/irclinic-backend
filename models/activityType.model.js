import mongoose from "mongoose";

const activityTypeSchema = new mongoose.Schema(
  {
    activityType: {
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

export const ActivityType = mongoose.model("ActivityType", activityTypeSchema);
