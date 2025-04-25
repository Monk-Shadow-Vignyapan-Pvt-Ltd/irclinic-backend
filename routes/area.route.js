import express from "express";
import { addArea, getAreas, getAreaById, deleteArea, updateArea} from "../controllers/area.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addArea").post( addArea);
router.route("/getAreas").get( getAreas);
router.route("/getAreaById/:id").put( getAreaById);
router.route("/updateArea/:id").put( updateArea);
router.route("/deleteArea/:id").delete(deleteArea);

export default router;