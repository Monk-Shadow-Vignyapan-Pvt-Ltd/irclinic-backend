import express from "express";
import {
  addSymptom,
  getSymptoms,
  getSymptomFrontend,
  getSymptomById,
  getSymptomName,
  getSymptomByUrl,
  deleteSymptom,
  updateSymptom,
  searchSymptom
  // updateSymptomRank,
} from "../controllers/symptom.controller.js";

const router = express.Router();

router.route("/addSymptom").post(addSymptom);
router.route("/searchSymptom").post(searchSymptom);
router.route("/getSymptoms").get(getSymptoms);
router.route("/getSymptomByUrl/:id").put(getSymptomByUrl);
router.route("/getSymptomFrontend").get(getSymptomFrontend);
router.route("/getSymptomName").get(getSymptomName);
router.route("/getSymptomById/:id").put(getSymptomById);
router.route("/updateSymptom/:id").post(updateSymptom);
router.route("/deleteSymptom/:id").delete(deleteSymptom);

export default router;
