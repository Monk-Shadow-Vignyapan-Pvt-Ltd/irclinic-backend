import express from "express";
import { addAuthor, getAuthors, getAuthorById, deleteAuthor, updateAuthor} from "../controllers/author.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addAuthor").post( addAuthor);
router.route("/getAuthors").get( getAuthors);
router.route("/getAuthorById/:id").put( getAuthorById);
router.route("/updateAuthor/:id").put( updateAuthor);
router.route("/deleteAuthor/:id").delete(deleteAuthor);

export default router;