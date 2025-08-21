import express from "express";
import {
     addService, getServices, getEnabledServices, getServiceName, searchServices, getServiceById, getServiceByUrl, getServicesByCategory,
     deleteService, updateService, onOffService, getServicesFrontend, getServicesBeforeAfter, cloneService, addServiceRanking,
     getServiceRanking, getServicesAfterRanking, addServiceInSearch, getServiceInSearch, getServicesAfterInSearch,getAllServices,
     getServiceImage,updateServiceRank
} from "../controllers/service.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addService").post(addService);
router.route("/getServices").get(getServices);
router.route("/getServiceName").get(getServiceName);
router.route("/getEnabledServices").get(getEnabledServices);
router.route("/searchServices").post(searchServices);
router.route("/getServiceById/:id").put(getServiceById);
router.route("/getServiceByUrl/:id").put(getServiceByUrl);
router.route("/getServicesByCategory/:id").get(getServicesByCategory);
router.route("/updateService/:id").post(updateService);
router.route("/onOffService/:id").post(onOffService);
router.route("/cloneService/:id").post(cloneService);
router.route("/deleteService/:id").delete(deleteService);
router.route("/getServicesFrontend").get(getServicesFrontend);
router.route("/getServicesBeforeAfter").get(getServicesBeforeAfter);
router.route("/addServiceRanking").post(addServiceRanking);
router.route("/getServiceRanking").get(getServiceRanking);
router.route("/getServicesAfterRanking").get(getServicesAfterRanking);
router.route("/addServiceInSearch").post(addServiceInSearch);
router.route("/getServiceInSearch").get(getServiceInSearch);
router.route("/getServicesAfterInSearch").get(getServicesAfterInSearch);
router.route("/getAllServices").get(getAllServices);
router.route("/getServiceImage/:id").get(getServiceImage);
router.route("/updateServiceRank").post( updateServiceRank);

export default router;