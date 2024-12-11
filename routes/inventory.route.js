import express from "express";
import { addInventory, getInventories, getInventoryById, deleteInventory, updateInventory} from "../controllers/inventory.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addInventory").post( addInventory);
router.route("/getInventories").get( getInventories);
router.route("/getInventoryById/:id").put( getInventoryById);
router.route("/updateInventory/:id").post( updateInventory);
router.route("/deleteInventory/:id").delete(deleteInventory);

export default router;