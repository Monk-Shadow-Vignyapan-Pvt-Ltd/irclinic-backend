import express from "express";
import { addQuicknote, getQuicknotes, getQuicknoteById, deleteQuicknote, updateQuicknote} from "../controllers/quicknote.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addQuicknote").post( addQuicknote);
router.route("/getQuicknotes").get( getQuicknotes);
router.route("/getQuicknoteById/:id").put( getQuicknoteById);
router.route("/updateQuicknote/:id").post( updateQuicknote);
router.route("/deleteQuicknote/:id").delete(deleteQuicknote);

export default router;