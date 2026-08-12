import express from "express";
import { addAd, getAds, getAdById, deleteAd, updateAd,downloadAdsExcel} from "../controllers/ad.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addAd").post( addAd);
router.route("/getAds/:id").get( getAds);
router.route("/getAdById/:id").put( getAdById);
router.route("/updateAd/:id").post( updateAd);
router.route("/deleteAd/:id").delete(deleteAd);
router.route("/downloadAdsExcel/:id").get(downloadAdsExcel);

export default router;