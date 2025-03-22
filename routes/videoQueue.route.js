import express from "express";
import { addVideoToQueue, getVideoQueue, getVideoById, deleteVideoFromQueue, updateVideoQueue} from "../controllers/videoQueue.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addVideoToQueue").post( addVideoToQueue);
router.route("/getVideoQueue").get( getVideoQueue);
router.route("/getVideoById/:id").put( getVideoById);
router.route("/updateVideoQueue/:id").post( updateVideoQueue);
router.route("/deleteVideoFromQueue/:id").delete(deleteVideoFromQueue);

export default router;