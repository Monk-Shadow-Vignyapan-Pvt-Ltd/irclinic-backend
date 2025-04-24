import express from "express";
import { addGallery, getGalleries, getGalleryById, deleteGallery, updateGallery} from "../controllers/gallary.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addGallery").post( addGallery);
router.route("/getGalleries").get( getGalleries);
router.route("/getGalleryById/:id").put( getGalleryById);
router.route("/updateGallery/:id").post( updateGallery);
router.route("/deleteGallery/:id").delete(deleteGallery);

export default router;