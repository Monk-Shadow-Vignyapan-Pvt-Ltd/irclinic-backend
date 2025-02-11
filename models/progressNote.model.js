import mongoose from "mongoose";

const progressNoteSchema = new mongoose.Schema(
  {
    noteTitle:{
        type: String,
        required: true,
    },
    progressNote: {
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

export const ProgressNote = mongoose.model("ProgressNote", progressNoteSchema);
