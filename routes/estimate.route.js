import express from "express";
import { addEstimate, getEstimates, getEstimateById, deleteEstimate, updateEstimate, dashboardEstimates,searchEstimates} from "../controllers/estimate.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addEstimate").post( addEstimate);
router.route("/getEstimates").get( getEstimates);
router.route("/getEstimateById/:id").put( getEstimateById);
router.route("/updateEstimate/:id").post( updateEstimate);
router.route("/deleteEstimate/:id").delete(deleteEstimate);
router.route("/dashboardEstimates").get( dashboardEstimates);
router.route("/searchEstimates").post( searchEstimates);

export default router;