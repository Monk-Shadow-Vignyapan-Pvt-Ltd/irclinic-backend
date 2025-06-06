import mongoose from "mongoose";

const subServiceSchema = new mongoose.Schema({
    subServiceName: { type: String, required: true,unique: true },
    subServiceDescription: { type: String, required: true },
    subServiceImage: {
        type: String, // Store image as base64 or use a URL reference
        required: true,
    },
    beforeAfterImage: {
        type: String, // Store image as base64 or use a URL reference
        required: false,
    },
    afterImage: {
        type: String, // Store image as base64 or use a URL reference
        required: false,
    },
    howWorks: {
        type: mongoose.Schema.Types.Mixed,  // Use Mixed for flexible structure (JSON-like object)
        required: false
    },
    howWorksName:{
        type: String, 
        required: false,
    },
    others: {
        type: mongoose.Schema.Types.Mixed,  // Use Mixed for flexible structure (JSON-like object)
        required: false
    },
    beforeAfterGallary: {
        type: mongoose.Schema.Types.Mixed,  // Use Mixed for flexible structure (JSON-like object)
        required: false
    },
    serviceId: { 
        type: mongoose.Schema.Types.ObjectId, 
        required:true
     },
     subServiceEnabled:{
        type:Boolean,
        required:true
     },
     subServiceUrl: { type: String, required: true ,unique: true },
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
     userId:{
        type: mongoose.Schema.Types.ObjectId, 
          required:false
      }

}, { timestamps: true });

export const SubService = mongoose.model("SubService", subServiceSchema);
