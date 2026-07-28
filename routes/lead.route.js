import express from "express";
import {
  getLeads,
  receiveGoogleLeadWebhook,
  receiveMetaLeadWebhook,
  verifyMetaWebhook,
  downloadLeadsExcel,
  updateLead
} from "../controllers/lead.controller.js";

const router = express.Router();

router.route("/google").post(receiveGoogleLeadWebhook);
router.route("/meta").get(verifyMetaWebhook);
router.route("/meta").post(receiveMetaLeadWebhook);
router.route("/getLeads").get(getLeads);
router.route("/downloadLeadsExcel").get( downloadLeadsExcel);
router.route("/updateLead/:id").post( updateLead);

export default router;
