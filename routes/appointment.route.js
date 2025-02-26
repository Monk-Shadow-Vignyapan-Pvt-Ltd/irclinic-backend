import express from "express";
import { addAppointment, getAppointments, getAppointmentById,getAppointmentsByPatientId, deleteAppointment, updateAppointment, dashboardAppointments} from "../controllers/appointment.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addAppointment").post( addAppointment);
router.route("/getAppointments/:id").get( getAppointments);
router.route("/getAppointmentById/:id").put( getAppointmentById);
router.route("/getAppointmentsByPatientId/:id").put( getAppointmentsByPatientId);
router.route("/updateAppointment/:id").post( updateAppointment);
router.route("/deleteAppointment/:id").delete(deleteAppointment);
router.route("/dashboardAppointments").get( dashboardAppointments);

export default router;