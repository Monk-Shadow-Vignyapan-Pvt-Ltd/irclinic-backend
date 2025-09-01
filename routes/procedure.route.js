import express from "express";
import { addProcedure, getProcedures,getAllProcedures, getProcedureById, deleteProcedure, updateProcedure,dashboardProcedures, searchProcedures, getProcedureUrls} from "../controllers/procedure.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addProcedure").post( addProcedure);
router.route("/getProcedures/:id").get( getProcedures);
router.route("/getAllProcedures/:id").get( getAllProcedures);
router.route("/getProcedureUrls/:id").get( getProcedureUrls);
router.route("/getProcedureById/:id").put( getProcedureById);
router.route("/updateProcedure/:id").post( updateProcedure);
router.route("/deleteProcedure/:id").delete(deleteProcedure);
router.route("/dashboardProcedures/:id").get( dashboardProcedures);
router.route("/searchProcedures/:id").post( searchProcedures);

export default router;