import express from "express";
import { addActivity, getActivities, getActivityById, deleteActivity, updateActivity , dashboardActivities,searchActivities} from "../controllers/activity.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addActivity").post( addActivity);
router.route("/getActivities/:id").get( getActivities);
router.route("/getActivityById/:id").put( getActivityById);
router.route("/updateActivity/:id").put( updateActivity);
router.route("/deleteActivity/:id").delete(deleteActivity);
router.route("/dashboardActivities/:id").get( dashboardActivities);
router.route("/searchActivities/:id").post( searchActivities);

export default router;