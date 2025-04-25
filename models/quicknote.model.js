import mongoose from "mongoose";

const quicknoteSchema = new mongoose.Schema({
    notes: { type: String, required: true,  },
    quicknoteType: { type: String, required: true,  },
    isAppointment: { type: Boolean, required: true,  },
    audio: { type: Buffer, required: false }, // Stores the binary audio data
    audioType: { type: String, required: false }, // Stores MIME type (e.g., "audio/mpeg")
    images:{
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    centerId: {
          type: mongoose.Schema.Types.ObjectId,
          required: false,
        },
    userId:{
        type: mongoose.Schema.Types.ObjectId, 
          required:false
      }
}, { timestamps: true });

export const Quicknote = mongoose.model("Quicknote", quicknoteSchema);
