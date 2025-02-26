import express from "express";
import { addActivityType, getActivityTypes, getActivityTypeById, deleteActivityType, updateActivityType} from "../controllers/activityType.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addActivityType").post( addActivityType);
router.route("/getActivityTypes/:id").get( getActivityTypes);
router.route("/getActivityTypeById/:id").put( getActivityTypeById);
router.route("/updateActivityType/:id").put( updateActivityType);
router.route("/deleteActivityType/:id").delete(deleteActivityType);

export default router;