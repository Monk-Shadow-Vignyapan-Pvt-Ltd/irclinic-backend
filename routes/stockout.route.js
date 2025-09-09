import express from "express";
import { addStockout, getStockouts,getStockoutById,getStockoutsByVendorId,
    getAllStockoutsByVendorId,updateStockout, searchStockouts,getStockoutsExcel} from "../controllers/stockout.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addStockout").post( addStockout);
router.route("/getStockouts/:id").get( getStockouts);
router.route("/getStockoutById/:id").put( getStockoutById);
router.route("/getStockoutsByVendorId/:id").get( getStockoutsByVendorId);
router.route("/getAllStockoutsByVendorId/:id").get( getAllStockoutsByVendorId);
router.route("/updateStockout/:id").post( updateStockout);
router.route("/searchStockouts/:id").post( searchStockouts);
router.route("/getStockoutsExcel").get(getStockoutsExcel);

export default router;