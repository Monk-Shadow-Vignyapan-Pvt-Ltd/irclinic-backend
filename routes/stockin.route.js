import express from "express";
import { addStockin, getStockins,getAllStockins, getStockinById,
    getStockinsByInventoryId, deleteStockin,updateStockin,dashboardStockins,
     searchStockins,getExpiringStockins,getStockinsExcel,getStockinByBarcode} from "../controllers/stockin.controller.js";
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
router.route("/getStockinByBarcode/:barcodeCode").get(getStockinByBarcode);

router.get("/generate", async(req,res)=>{
 try{
  const {code="123456"}=req.query;
  const png=await bwipjs.toBuffer({
   bcid:"code128",text:code,scale:3,height:10,includetext:true
  });
  res.set("Content-Type","image/png");
  res.send(png);
 }catch(e){res.status(500).send("err");}
});

export default router;