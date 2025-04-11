import express from "express";
import { addSubService, getSubServices,searchSubServices, getSubServiceById,getSubServiceByUrl,getSubServicesByServiceId, deleteSubService, updateSubService,onOffSubService,getSubServicesFrontend,getSubServicesBeforeAfter,cloneSubService} from "../controllers/sub_service.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addSubService").post( addSubService);
router.route("/getSubServices").get( getSubServices);
router.route("/searchSubServices").post( searchSubServices);
router.route("/getSubServiceById/:id").put( getSubServiceById);
router.route("/getSubServiceByUrl/:id").put( getSubServiceByUrl);
router.route("/getSubServicesByServiceId/:id").get( getSubServicesByServiceId);
router.route("/updateSubService/:id").post( updateSubService);
router.route("/onOffSubService/:id").post( onOffSubService);
router.route("/cloneSubService/:id").post( cloneSubService);
router.route("/deleteSubService/:id").delete(deleteSubService);
router.route("/getSubServicesFrontend").get(getSubServicesFrontend);
router.route("/getSubServicesBeforeAfter").get(getSubServicesBeforeAfter);

export default router;