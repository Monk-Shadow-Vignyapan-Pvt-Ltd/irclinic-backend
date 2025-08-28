import express from "express";
import { addDiagnosis, getDiagnoses, getDiagnosisById, deleteDiagnosis, updateDiagnosis} from "../controllers/diagnosis.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addDiagnosis").post( addDiagnosis);
router.route("/getDiagnoses").get( getDiagnoses);
router.route("/getDiagnosisById/:id").put( getDiagnosisById);
router.route("/updateDiagnosis/:id").put( updateDiagnosis);
router.route("/deleteDiagnosis/:id").delete(deleteDiagnosis);

export default router;