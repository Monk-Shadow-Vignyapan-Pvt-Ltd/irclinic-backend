import express from "express";
import { addInvoice, getInvoices, getInvoiceById, deleteInvoice, updateInvoice, dashboardInvoices,searchInvoices} from "../controllers/invoice.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addInvoice").post( addInvoice);
router.route("/getInvoices/:id").get( getInvoices);
router.route("/getInvoiceById/:id").put( getInvoiceById);
router.route("/updateInvoice/:id").post( updateInvoice);
router.route("/deleteInvoice/:id").delete(deleteInvoice);
router.route("/dashboardInvoices/:id").get( dashboardInvoices);
router.route("/searchInvoices/:id").post( searchInvoices);

export default router;