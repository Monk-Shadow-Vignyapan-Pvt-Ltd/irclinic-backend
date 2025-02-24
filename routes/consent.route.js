import express from "express";
import { addConsent, getConsents, getConsentById, deleteConsent, updateConsent} from "../controllers/consent.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addConsent").post( addConsent);
router.route("/getConsents").get( getConsents);
router.route("/getConsentById/:id").put( getConsentById);
router.route("/updateConsent/:id").put( updateConsent);
router.route("/deleteConsent/:id").delete(deleteConsent);

export default router;