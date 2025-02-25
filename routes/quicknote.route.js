import express from "express";
import { 
    addQuicknote, 
    getQuicknotes, 
    getQuicknoteById, 
    deleteQuicknote, 
    updateQuicknote 
} from "../controllers/quicknote.controller.js";
import multer from "multer";

const router = express.Router();

// Configure Multer to store files in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Routes
router.route("/addQuicknote").post(upload.single("audio"), addQuicknote); // Accepts audio file
router.route("/getQuicknotes").get(getQuicknotes);
router.route("/getQuicknoteById/:id").get(getQuicknoteById);
router.route("/updateQuicknote/:id").post(upload.single("audio"), updateQuicknote); // Allows updating audio
router.route("/deleteQuicknote/:id").delete(deleteQuicknote);

export default router;
