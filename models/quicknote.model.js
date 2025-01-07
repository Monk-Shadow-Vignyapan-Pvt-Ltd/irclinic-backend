import mongoose from "mongoose";

const quicknoteSchema = new mongoose.Schema({
    notes: { type: String, required: true,  },
    isAppointment: { type: Boolean, required: true,  },
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
