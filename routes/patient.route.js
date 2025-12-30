import express from "express";
import { addPatient, getOPDPatients,getOutSidePatients,getCampPatients,getAllPatients,
     getPatientById,getPatientsByCenterId, deletePatient, updatePatient, dashboardPatients,
      searchOPDPatients,searchOutSidePatients,searchCampPatients,clonePatientToCenter,
    searchPatient} from "../controllers/patient.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addPatient").post( addPatient);
router.route("/getOPDPatients/:id").get( getOPDPatients);
router.route("/getOutSidePatients/:id").get( getOutSidePatients);
router.route("/getCampPatients/:id").get( getCampPatients);
router.route("/getAllPatients/:id").get( getAllPatients);
router.route("/getPatientById/:id").put( getPatientById);
router.route("/getPatientsByCenterId/:id").get( getPatientsByCenterId);
router.route("/updatePatient/:id").post( updatePatient);
router.route("/deletePatient/:id").delete(deletePatient);
router.route("/dashboardPatients/:id").get( dashboardPatients);
router.route("/searchOPDPatients/:id").post( searchOPDPatients);
router.route("/searchOutSidePatients/:id").post( searchOutSidePatients);
router.route("/searchCampPatients/:id").post( searchCampPatients);
router.route("/clonePatientToCenter").post( clonePatientToCenter);
router.route("/searchPatient").post( searchPatient);

export default router;