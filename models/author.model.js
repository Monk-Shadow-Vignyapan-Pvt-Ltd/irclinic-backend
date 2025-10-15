import mongoose from "mongoose";

const authorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    bio: {
        type: String,
        required: false,
      },
    authorImage: {
        type: String,
        required: false,
      },
    authorUrl : {
        type: String,
        required: false,
      },
    
  },
  { timestamps: true }
);

export const Author = mongoose.model("Author", authorSchema);
