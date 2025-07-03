import express from "express";
import {
  addDisease,
  getDiseases,
  getDiseasesFrontend,
  getDiseaseById,
  getDiseaseName,
  getDiseaseByUrl,
  deleteDisease,
  updateDisease,
  searchDiseases
  // updateDiseaseRank,
} from "../controllers/disease.controller.js";

const router = express.Router();

router.route("/addDisease").post(addDisease);
router.route("/searchDiseases").post(searchDiseases);
router.route("/getDiseases").get(getDiseases);
router.route("/getDiseaseByUrl/:id").put(getDiseaseByUrl);
router.route("/getDiseasesFrontend").get(getDiseasesFrontend);
router.route("/getDiseaseName").get(getDiseaseName);
router.route("/getDiseaseById/:id").put(getDiseaseById);
router.route("/updateDisease/:id").post(updateDisease);
// router.route("/updateDiseaseRank").post(updateDiseaseRank);
router.route("/deleteDisease/:id").delete(deleteDisease);

export default router;
