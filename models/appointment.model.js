import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      validate: {
        validator: function (value) {
          return (
            this.appointmentType !== "quick" || value != null
          );
        },
        message: "Start date is required unless appointment type is 'quick'.",
      },
    },
    appointmentType: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    notes:{
      type: String,
      validate: {
        validator: function (value) {
          return (
            this.appointmentType !== "Regular" || value != null
          );
        },
        message: "Start date is required unless appointment type is 'Regular'.",
      },
    },
    start: {
      type: Date,
      validate: {
        validator: function (value) {
          return (
            this.appointmentType !== "quick" || value != null
          );
        },
        message: "Start date is required unless appointment type is 'quick'.",
      },
    },
    end: {
      type: Date,
      validate: {
        validator: function (value) {
          return (
            this.appointmentType !== "quick" || value != null
          );
        },
        message: "End date is required unless appointment type is 'quick'.",
      },
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
  },
  { timestamps: true }
);

export const Appointment = mongoose.model("Appointment", appointmentSchema);
