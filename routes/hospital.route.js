import express from "express";
import { addHospital, getHospitals,getAllHospitals, getHospitalById, deleteHospital, updateHospital,searchHospitals, dashboardHospitals} from "../controllers/hospital.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addHospital").post( addHospital);
router.route("/getHospitals/:id").get( getHospitals);
router.route("/getAllHospitals/:id").get( getAllHospitals);
router.route("/getHospitalById/:id").put( getHospitalById);
router.route("/updateHospital/:id").post( updateHospital);
router.route("/deleteHospital/:id").delete(deleteHospital);
router.route("/searchHospitals/:id").post( searchHospitals);
router.route("/dashboardHospitals/:id").get( dashboardHospitals);

export default router;