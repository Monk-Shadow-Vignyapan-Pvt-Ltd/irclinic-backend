import express from "express";
import { addStockin, getStockins,getAllStockins, getStockinById,
    getStockinsByInventoryId, deleteStockin,updateStockin,dashboardStockins,
     searchStockins,getExpiringStockins,getStockinsExcel,getDateWiseStockExcelWithOverallTotal,
     getStockinByBarcode} from "../controllers/stockin.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";
import bwipjs from "bwip-js";

const router = express.Router();

router.route("/addStockin").post( addStockin);
router.route("/getStockins/:id").get( getStockins);
router.route("/getAllStockins/:id").get( getAllStockins);
router.route("/getStockinById/:id").put( getStockinById);
router.route("/getStockinsByInventoryId/:id").put( getStockinsByInventoryId);
router.route("/updateStockin/:id").post( updateStockin);
router.route("/deleteStockin/:id").delete(deleteStockin);
router.route("/dashboardStockins/:id").get( dashboardStockins);
router.route("/searchStockins/:id").post( searchStockins);
router.route("/getExpiringStockins/:id").get( getExpiringStockins);
router.route("/getStockinsExcel").get(getStockinsExcel);
router.route("/getClosingExcel").get(getDateWiseStockExcelWithOverallTotal);
router.route("/getStockinByBarcode/:barcodeCode").get(getStockinByBarcode);

router.get("/generate", async (req, res) => {
  try {
    const { code = "123456" } = req.query;

    const png = await bwipjs.toBuffer({
      bcid: "qrcode",
      text: code,
      scale: 4,
      version: 5,
      includetext: true,     // <-- SHOW TEXT BELOW QR
      textxalign: "center",  // <-- ALIGN TEXT
      textsize: 12,          // <-- OPTIONAL: increase text size
    });

    res.set("Content-Type", "image/png");
    res.send(png);

  } catch (e) {
    console.log(e);
    res.status(500).send("QR generation error");
  }
});



export default router;