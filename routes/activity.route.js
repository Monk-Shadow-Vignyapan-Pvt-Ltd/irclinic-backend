import express from "express";
import { addActivity, getActivities, getActivityById, deleteActivity, updateActivity} from "../controllers/activity.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addActivity").post( addActivity);
router.route("/getActivities").get( getActivities);
router.route("/getActivityById/:id").put( getActivityById);
router.route("/updateActivity/:id").put( updateActivity);
router.route("/deleteActivity/:id").delete(deleteActivity);

export default router;