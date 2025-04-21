import express from "express";
import { addDisease, getDiseases, getDiseaseById,getDiseaseName, deleteDisease, updateDisease,updateDiseaseRank} from "../controllers/disease.controller.js";

const router = express.Router();

router.route("/addDisease").post( addDisease);
router.route("/getDiseases").get( getDiseases)
router.route("/getDiseaseName").get(getDiseaseName);
router.route("/getDiseaseById/:id").put( getDiseaseById);
router.route("/updateDisease/:id").post( updateDisease);
router.route("/updateDiseaseRank").post( updateDiseaseRank);
router.route("/deleteDisease/:id").delete(deleteDisease);

export default router;