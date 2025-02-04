import express from "express";
import { addState, getStates, getStateById, deleteState, updateState, dashboardStates, searchStates} from "../controllers/state.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addState").post( addState);
router.route("/getStates").get( getStates);
router.route("/getStateById/:id").put( getStateById);
router.route("/updateState/:id").post( updateState);
router.route("/deleteState/:id").delete(deleteState);
router.route("/dashboardStates").get( dashboardStates);
router.route("/searchStates").post( searchStates);

export default router;