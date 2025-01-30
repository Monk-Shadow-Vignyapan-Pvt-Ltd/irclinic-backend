import express from "express";
import { addStockout, getStockouts} from "../controllers/stockout.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addStockout").post( addStockout);
router.route("/getStockouts").get( getStockouts);

export default router;