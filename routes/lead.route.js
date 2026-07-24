import express from "express";
import {
  getLeads,
  receiveGoogleLeadWebhook,
  receiveMetaLeadWebhook,
  verifyMetaWebhook,
} from "../controllers/lead.controller.js";

const router = express.Router();

router.route("/google").post(receiveGoogleLeadWebhook);
router.route("/meta").get(verifyMetaWebhook);
router.route("/meta").post(receiveMetaLeadWebhook);
router.route("/getLeads").get(getLeads);

export default router;
