import express from "express";
import { addStockin, getStockins, getStockinById,getStockinsByInventoryId, deleteStockin,updateStockin,dashboardStockins} from "../controllers/stockin.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addStockin").post( addStockin);
router.route("/getStockins").get( getStockins);
router.route("/getStockinById/:id").put( getStockinById);
router.route("/getStockinsByInventoryId/:id").put( getStockinsByInventoryId);
router.route("/updateStockin/:id").post( updateStockin);
router.route("/deleteStockin/:id").delete(deleteStockin);
router.route("/dashboardStockins").get( dashboardStockins);

export default router;