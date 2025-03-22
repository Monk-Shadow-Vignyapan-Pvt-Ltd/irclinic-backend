// models/Doctor.js
import mongoose from "mongoose";


const videoQueueSchema = new mongoose.Schema({
    videoLink: {
        type: String,
        required: true,
      },
    userId:{
            type: mongoose.Schema.Types.ObjectId, 
              required:false
          }
    
}, { timestamps: true });

export const VideoQueue = mongoose.model("VideoQueue", videoQueueSchema);
