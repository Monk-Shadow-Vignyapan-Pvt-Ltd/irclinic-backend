import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema({
    serviceName: { type: String, required: true, unique: true },
    serviceDescription: { type: String, required: true },
    serviceImage: {
        type: String, // Store image as base64 or use a URL reference
        required: true,
    },
    serviceType: {
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
    proceduresPerformedTotal: {
        type: String,
        required: false,
    },
    successRatePercentage: {
        type: String,
        required: false,
    },
    yearsExperienceTotal: {
        type: String,
        required: false,
    },
    patientSatisfactionRatePercentage: {
        type: String,
        required: false,
    },
    educationalVideoTitle: {
        type: String,
        required: false,
    },
    educationalVideoDescription: {
        type: String,
        required: false,
    },
    educationalVideoUrl: {
        type: String,
        required: false,
    },
    whyChoose: {
        type: mongoose.Schema.Types.Mixed,  // Use Mixed for flexible structure (JSON-like object)
        required: false
    },
    whyChooseName: {
        type: String,
        required: false,
    },
    howWorks: {
        type: mongoose.Schema.Types.Mixed,  // Use Mixed for flexible structure (JSON-like object)
        required: false
    },
    howWorksName: {
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
    procedureId: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    diseaseId: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    symptomId: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    },
    serviceEnabled: {
        type: Boolean,
        required: true
    },
    serviceUrl: { type: String, required: true, unique: true },
    oldUrls: {
        type: mongoose.Schema.Types.Mixed,  // Use Mixed for flexible structure (JSON-like object)
        required: false
    },
    seoTitle: {
        type: String,
        required: false,
    },
    seoDescription: {
        type: String,
        required: false,
    },
    schema: {
      type: String, // Store image as base64 or use a URL reference
      required: false,
    },
    rank:{
        type: Number, // Store image as base64 or use a URL reference
        required: false,    
      },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false
    }

}, { timestamps: true });

export const Service = mongoose.model("Service", serviceSchema);
