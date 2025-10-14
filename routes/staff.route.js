import express from "express";
import { addStaff, getStaff,getIRStaff, getOtherStaff,getStaffById, deleteStaff,
     updateStaff,searchStaff, getStaffExcel} from "../controllers/staff.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addStaff").post( addStaff);
router.route("/getStaff/:id").get( getStaff);
router.route("/getIRStaff/:id").get( getIRStaff);
router.route("/getOtherStaff/:id").get( getOtherStaff);
router.route("/getStaffById/:id").put( getStaffById);
router.route("/updateStaff/:id").put( updateStaff);
router.route("/deleteStaff/:id").delete(deleteStaff);
router.route("/searchStaff/:id").post( searchStaff);
router.route("/getStaffExcel").get(getStaffExcel); // Added route for exporting doctors to Excel

export default router;
