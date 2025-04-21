import express from "express";
import {
  addBlog,
  getBlogs,
  getBlogById,
  getBlogByUrl,
  deleteBlog,
  getBlogsFrontend,
  getRecentBlog,
  updateBlog,
} from "../controllers/blog.controller.js";
import isAuthenticated from "../auth/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/addBlog").post(addBlog);
router.route("/getBlogs").get(getBlogs);
router.route("/getRecentBlog").get(getRecentBlog);
router.route("/getBlogById/:id").put(getBlogById);
router.route("/getBlogByUrl/:id").post(getBlogByUrl);
router.route("/updateBlog/:id").post(updateBlog);
router.route("/getBlogsFrontend").get(getBlogsFrontend);
router.route("/deleteBlog/:id").delete(deleteBlog);

export default router;
