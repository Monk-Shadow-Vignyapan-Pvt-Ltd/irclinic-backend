import mongoose from "mongoose";

const diseaseSchema = new mongoose.Schema({
    diseaseName: { type: String, required: true },
    diseaseDescription: { type: String, required: true },
    parentID:{
      type: String, // Store image as base64 or use a URL reference
      required: false,
    },
    // diseaseImage: {
    //     type: String, // Store image as base64 or use a URL reference
    //     required: true,
    //   },
      diseaseURL: { type: String, required: true ,unique: true },
       oldUrls: { 

              type: mongoose.Schema.Types.Mixed,  // Use Mixed for flexible structure (JSON-like object)
              required: false
          },
      seoTitle:{
         type: String,
         required: false,
       },
      seoDescription: {
         type: String,
         required: false,
       },
    // rank:{
    //   type: String, // Store image as base64 or use a URL reference
    //   required: true,    
    // },
    userId:{
        type: mongoose.Schema.Types.ObjectId, 
          required:false
      }
    
}, { timestamps: true });

export const Disease = mongoose.model("disease", diseaseSchema);
