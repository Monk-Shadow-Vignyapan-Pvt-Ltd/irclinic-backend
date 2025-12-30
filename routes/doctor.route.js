import express from "express";
import { addDoctor, getDoctors,getAllDoctors,getReferenceDoctors,
     getDoctorById, deleteDoctor, updateDoctor,dashboardDoctors,searchDoctors, getDoctorsExcel} from "../controllers/doctor.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addDoctor").post( addDoctor);
router.route("/getDoctors/:id").get( getDoctors);
router.route("/getAllDoctors").get( getAllDoctors);
router.route("/getReferenceDoctors/:id").get( getReferenceDoctors);
router.route("/getDoctorById/:id").put( getDoctorById);
router.route("/updateDoctor/:id").put( updateDoctor);
router.route("/deleteDoctor/:id").delete(deleteDoctor);
router.route("/dashboardDoctors/:id").get( dashboardDoctors);
router.route("/searchDoctors/:id").post( searchDoctors);
router.route("/getDoctorsExcel").get(getDoctorsExcel); // Added route for exporting doctors to Excel

export default router;
