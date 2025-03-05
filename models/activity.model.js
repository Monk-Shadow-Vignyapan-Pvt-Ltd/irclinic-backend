import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    activityType: {
      type: String,
      required: true,
    },
    activityTitle: {
      type: String,
      required: true,
    },
    assignedTo: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
      },
      notes: {
        type: String,
        required: true,
      },
      comments:{
        type: mongoose.Schema.Types.Mixed,
        required: false,
      },
    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    repeat: {
      type: String,
      required: false,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    status:{
      type: String,
      required: false,
    }
  },
  { timestamps: true }
);

export const Activity = mongoose.model("Activity", activitySchema);
