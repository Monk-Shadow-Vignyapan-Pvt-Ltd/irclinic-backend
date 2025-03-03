import express from "express";
import { addToken, getTokens,} from "../controllers/firebaseToken.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addToken").post( addToken);
router.route("/getTokens/:id").get( getTokens);

export default router;