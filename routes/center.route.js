import express from "express";
import { addCenter, getCenters,getAllCenters, getCenterById,getCenterByUrl, deleteCenter, updateCenter, dashboardCenters,searchCenters, getCenterSeoUrls, getCenterImage} from "../controllers/center.controller.js";

const router = express.Router();

router.route("/addCenter").post( addCenter);
router.route("/getCenters").get( getCenters);
router.route("/getCenterSeoUrls").get(getCenterSeoUrls);
router.route("/getAllCenters").get( getAllCenters);
router.route("/getCenterById/:id").put( getCenterById);
router.route("/getCenterByUrl/:id").put( getCenterByUrl);
router.route("/updateCenter/:id").post( updateCenter);
router.route("/deleteCenter/:id").delete(deleteCenter);
router.route("/dashboardCenters").get( dashboardCenters);
router.route("/searchCenters").post( searchCenters);
router.route("/getCenterImage/:id").get(getCenterImage);

export default router;