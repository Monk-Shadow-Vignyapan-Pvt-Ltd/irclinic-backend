import express from "express";
import { addStockout, getStockouts,getStockoutById,updateStockout} from "../controllers/stockout.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addStockout").post( addStockout);
router.route("/getStockouts").get( getStockouts);
router.route("/getStockoutById/:id").put( getStockoutById);
router.route("/updateStockout/:id").post( updateStockout);

export default router;