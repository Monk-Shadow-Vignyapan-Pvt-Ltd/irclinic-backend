import express from "express";
import { addDoctor, getDoctors, getDoctorById, deleteDoctor, updateDoctor,dashboardDoctors,searchDoctors} from "../controllers/doctor.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addDoctor").post( addDoctor);
router.route("/getDoctors").get( getDoctors);
router.route("/getDoctorById/:id").put( getDoctorById);
router.route("/updateDoctor/:id").put( updateDoctor);
router.route("/deleteDoctor/:id").delete(deleteDoctor);
router.route("/dashboardDoctors").get( dashboardDoctors);
router.route("/searchDoctors").post( searchDoctors);

export default router;