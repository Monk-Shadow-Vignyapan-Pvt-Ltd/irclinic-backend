import express from "express";
import { upsertPrint,  getPrintByCenterId} from "../controllers/print.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/upsertPrint").post( upsertPrint);
router.route("/getPrintByCenterId/:id").get( getPrintByCenterId);

export default router;