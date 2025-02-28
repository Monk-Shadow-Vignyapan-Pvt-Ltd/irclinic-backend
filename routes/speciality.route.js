import express from "express";
import { addSpeciality, getSpecialities, getSpecialityById, deleteSpeciality, updateSpeciality} from "../controllers/speciality.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addSpeciality").post( addSpeciality);
router.route("/getSpecialities/:id").get( getSpecialities);
router.route("/getSpecialityById/:id").put( getSpecialityById);
router.route("/updateSpeciality/:id").put( updateSpeciality);
router.route("/deleteSpeciality/:id").delete(deleteSpeciality);

export default router;