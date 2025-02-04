import express from "express";
import { addVendor, getVendors, getVendorById, deleteVendor, updateVendor, dashboardVendors, searchVendors} from "../controllers/vendor.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addVendor").post( addVendor);
router.route("/getVendors").get( getVendors);
router.route("/getVendorById/:id").put( getVendorById);
router.route("/updateVendor/:id").post( updateVendor);
router.route("/deleteVendor/:id").delete(deleteVendor);
router.route("/dashboardVendors").get( dashboardVendors);
router.route("/searchVendors").post( searchVendors);

export default router;