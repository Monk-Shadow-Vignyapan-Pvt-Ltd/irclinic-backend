import express from "express";
import { addPatient, getPatients, getPatientById,getPatientsByCenterId, deletePatient, updatePatient, dashboardPatients} from "../controllers/patient.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addPatient").post( addPatient);
router.route("/getPatients").get( getPatients);
router.route("/getPatientById/:id").put( getPatientById);
router.route("/getPatientsByCenterId/:id").get( getPatientsByCenterId);
router.route("/updatePatient/:id").post( updatePatient);
router.route("/deletePatient/:id").delete(deletePatient);
router.route("/dashboardPatients").get( dashboardPatients);

export default router;