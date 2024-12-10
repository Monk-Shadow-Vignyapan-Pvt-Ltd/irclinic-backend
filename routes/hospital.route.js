import express from "express";
import { addHospital, getHospitals, getHospitalById, deleteHospital, updateHospital} from "../controllers/hospital.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addHospital").post( addHospital);
router.route("/getHospitals").get( getHospitals);
router.route("/getHospitalById/:id").put( getHospitalById);
router.route("/updateHospital/:id").post( updateHospital);
router.route("/deleteHospital/:id").delete(deleteHospital);

export default router;