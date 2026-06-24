import express from "express";
import {
  addKeyword,
  getKeywords,
  getKeywordById,
  updateKeyword,
  deleteKeyword
} from "../controllers/keyword.controller.js";

const router = express.Router();

router.route("/addKeyword").post(addKeyword);
router.route("/getKeywords").get(getKeywords);
router.route("/getKeywordById/:id").put(getKeywordById);
router.route("/deleteKeyword/:id").delete(deleteKeyword);
router.route("/updateKeyword/:id").post(updateKeyword);

export default router;
