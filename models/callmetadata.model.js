import mongoose from "mongoose";

const callMetadataSchema = new mongoose.Schema(
  {
    // Exotel call SID — the unique link between your DB and Exotel
    callSid: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    // Freeform followups — array of objects, structure is up to you
    // Example: [{ status, note, updatedDate, updatedBy }]
    followups: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
  },
  { timestamps: true, minimize: false }
);

export const CallMetadata = mongoose.model("CallMetadata", callMetadataSchema);