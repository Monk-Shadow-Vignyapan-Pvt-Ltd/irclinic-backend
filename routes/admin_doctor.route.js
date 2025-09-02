import express from "express";
import { getDoctorInSearch,cloneDoctor, addDoctor,getDoctors ,  getDoctorsFrontend, deleteDoctor, updateDoctor, getDoctorByUrl, getDoctorById, searchDoctors, getDoctorUrls} from "../controllers/admin_doctor.controller.js";

const router = express.Router();

router.route("/addDoctor").post( addDoctor);
router.route("/getDoctors").get( getDoctors);
router.route("/getDoctorUrls").get( getDoctorUrls);
router.route("/searchDoctors").post( searchDoctors);
router.route("/getDoctorById/:id").put( getDoctorById);
router.route("/getDoctorByUrl/:id").put( getDoctorByUrl);
router.route("/updateDoctor/:id").post( updateDoctor);
router.route("/cloneDoctor/:id").post( cloneDoctor);
router.route("/deleteDoctor/:id").delete(deleteDoctor);
router.route("/getDoctorsFrontend").get(getDoctorsFrontend);
router.route("/getDoctorInSearch").get(getDoctorInSearch);

export default router;