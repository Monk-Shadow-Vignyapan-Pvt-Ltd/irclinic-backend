import express from "express";
import { addProgressNote, getProgressNotes, getProgressNoteById, deleteProgressNote, updateProgressNote} from "../controllers/progressNote.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addProgressNote").post( addProgressNote);
router.route("/getProgressNotes").get( getProgressNotes);
router.route("/getProgressNoteById/:id").put( getProgressNoteById);
router.route("/updateProgressNote/:id").put( updateProgressNote);
router.route("/deleteProgressNote/:id").delete(deleteProgressNote);

export default router;