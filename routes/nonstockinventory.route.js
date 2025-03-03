import express from "express";
import { addNonStockInventory, getNonStockInventories, getNonStockInventoryById, deleteNonStockInventory, updateNonStockInventory} from "../controllers/nonstockinventory.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addNonStockInventory").post( addNonStockInventory);
router.route("/getNonStockInventories/:id").get( getNonStockInventories);
router.route("/getNonStockInventoryById/:id").put( getNonStockInventoryById);
router.route("/updateNonStockInventory/:id").put( updateNonStockInventory);
router.route("/deleteNonStockInventory/:id").delete(deleteNonStockInventory);

export default router;