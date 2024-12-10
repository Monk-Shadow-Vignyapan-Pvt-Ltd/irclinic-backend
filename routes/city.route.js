import express from "express";
import { addCity, getCities, getCityById, deleteCity, updateCity} from "../controllers/city.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addCity").post( addCity);
router.route("/getCities").get( getCities);
router.route("/getCityById/:id").put( getCityById);
router.route("/updateCity/:id").post( updateCity);
router.route("/deleteCity/:id").delete(deleteCity);

export default router;