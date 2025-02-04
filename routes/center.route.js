import express from "express";
import { addCenter, getCenters, getCenterById, deleteCenter, updateCenter, dashboardCenters,searchCenters} from "../controllers/center.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addCenter").post( addCenter);
router.route("/getCenters").get( getCenters);
router.route("/getCenterById/:id").put( getCenterById);
router.route("/updateCenter/:id").post( updateCenter);
router.route("/deleteCenter/:id").delete(deleteCenter);
router.route("/dashboardCenters").get( dashboardCenters);
router.route("/searchCenters").post( searchCenters);

export default router;