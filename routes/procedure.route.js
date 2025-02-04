import express from "express";
import { addProcedure, getProcedures, getProcedureById, deleteProcedure, updateProcedure,dashboardProcedures, searchProcedures} from "../controllers/procedure.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addProcedure").post( addProcedure);
router.route("/getProcedures").get( getProcedures);
router.route("/getProcedureById/:id").put( getProcedureById);
router.route("/updateProcedure/:id").post( updateProcedure);
router.route("/deleteProcedure/:id").delete(deleteProcedure);
router.route("/dashboardProcedures").get( dashboardProcedures);
router.route("/searchProcedures").post( searchProcedures);

export default router;