import express from "express";
import { addOccupation, getOccupations, getOccupationById, deleteOccupation, updateOccupation} from "../controllers/occupation.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addOccupation").post( addOccupation);
router.route("/getOccupations").get( getOccupations);
router.route("/getOccupationById/:id").put( getOccupationById);
router.route("/updateOccupation/:id").put( updateOccupation);
router.route("/deleteOccupation/:id").delete(deleteOccupation);

export default router;