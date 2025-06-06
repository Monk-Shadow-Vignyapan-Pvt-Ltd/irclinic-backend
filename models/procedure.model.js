import mongoose from "mongoose";

const procedureSchema = new mongoose.Schema({
    procedureName: { type: String, required: true },
    cost: { type: Number, required: true ,default:0},
    notes: { type: String, required: false },
    instructions: { type: mongoose.Schema.Types.Mixed, required: false },
    isProcedure: { type: Boolean, required: true, default:true },
    procedureUrl: { type: String, required: false },
    userId:{
        type: mongoose.Schema.Types.ObjectId, 
          required:false
      },
      centerId:{
        type: mongoose.Schema.Types.Mixed, 
          required:false
      },

    
}, { timestamps: true });

export const Procedure = mongoose.model("Procedure", procedureSchema);
