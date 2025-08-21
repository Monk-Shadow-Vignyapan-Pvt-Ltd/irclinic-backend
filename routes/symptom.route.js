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
  getDashboardSymptoms,
  searchSymptom,
  // updateSymptomRank,
  getAllSymptoms
} from "../controllers/symptom.controller.js";

const router = express.Router();

router.route("/addSymptom").post(addSymptom);
router.route("/searchSymptom").post(searchSymptom);
router.route("/getSymptoms").get(getSymptoms);
router.route("/getDashboardSymptoms").get(getDashboardSymptoms);
router.route("/getSymptomByUrl/:id").put(getSymptomByUrl);
router.route("/getSymptomFrontend").get(getSymptomFrontend);
router.route("/getSymptomName").get(getSymptomName);
router.route("/getSymptomById/:id").put(getSymptomById);
router.route("/updateSymptom/:id").post(updateSymptom);
router.route("/deleteSymptom/:id").delete(deleteSymptom);
router.route("/getAllSymptoms").get(getAllSymptoms);

export default router;
