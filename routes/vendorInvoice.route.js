import express from "express";
import {
    addVendorInvoice,
    getVendorInvoices,
    getVendorInvoiceById,
    getVendorInvoicesByVendorId,
    updateVendorInvoice,
    approveVendorInvoice,
    deleteVendorInvoice
} from "../controllers/vendorInvoice.controller.js";

const router = express.Router();

router.route("/addVendorInvoice").post(addVendorInvoice);
router.route("/getVendorInvoices/:id").get(getVendorInvoices);
router.route("/getVendorInvoiceById/:id").put(getVendorInvoiceById);
router.route("/getVendorInvoicesByVendorId/:id").get( getVendorInvoicesByVendorId);
router.route("/deleteVendorInvoice/:id").delete(deleteVendorInvoice);
router.route("/updateVendorInvoice/:id").post(updateVendorInvoice);
router.route("/approveVendorInvoice/:id").post(approveVendorInvoice);

export default router;
