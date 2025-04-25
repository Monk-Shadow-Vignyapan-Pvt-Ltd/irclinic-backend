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

// Create an instance of multer with fields support
const upload = multer({ storage });

// Accept both audio and images (multiple files)
const quicknoteUpload = upload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'images', maxCount: 10 }
]);
  

// Routes
router.route("/addQuicknote").post(quicknoteUpload, addQuicknote); // Accepts audio file
router.route("/getQuicknotes/:id").get(getQuicknotes);
router.route("/getQuicknoteById/:id").get(getQuicknoteById);
router.route("/updateQuicknote/:id").post(quicknoteUpload, updateQuicknote); // Allows updating audio
router.route("/deleteQuicknote/:id").delete(deleteQuicknote);

export default router;
