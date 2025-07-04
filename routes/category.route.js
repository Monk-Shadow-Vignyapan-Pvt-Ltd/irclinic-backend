import express from "express";
import { addCategory, getCategories, getCategoryName, getCategoryById, getCategoryByUrl, deleteCategory, updateCategory, updateCategoryRank } from "../controllers/category.controller.js";

const router = express.Router();

router.route("/addCategory").post(addCategory);
router.route("/getCategories").get(getCategories);
router.route("/getCategoryName").get(getCategoryName);
router.route("/getCategoryById/:id").put(getCategoryById);
router.route("/getCategoryByUrl/:id").put(getCategoryByUrl);
router.route("/updateCategory/:id").post(updateCategory);
router.route("/updateCategoryRank").post(updateCategoryRank);
router.route("/deleteCategory/:id").delete(deleteCategory);

export default router;