import { Category } from '../models/category.model.js';
import cloudinary from "../utils/cloudinary.js";
import getDataUri from "../utils/datauri.js";
import sharp from 'sharp';
import { Service } from '../models/service.model.js';

// Add a new category
export const addCategory = async (req, res) => {
    try {
        const {
            categoryName,
            categoryDescription,
            rank,
            imageBase64,
            categoryGif,
            userId,
            categoryUrl,
            seoTitle,
            seoDescription,
        } = req.body;

        // Validate base64 image data
        if (!imageBase64 || !imageBase64.startsWith('data:image')) {
            return res.status(400).json({ message: 'Invalid image data', success: false });
        }

        // Save the category directly with original base64 (without compressing)
        const category = new Category({
            categoryName,
            categoryImage: imageBase64, // Keep original base64, supports GIF, JPEG, PNG, etc.
            categoryGif,
            categoryDescription,
            userId,
            categoryUrl,
            seoTitle,
            seoDescription,
            rank,
        });

        await category.save();
        res.status(201).json({ category, success: true });
    } catch (error) {
        console.error('Error uploading category:', error);
        res.status(500).json({ message: 'Failed to upload category', success: false });
    }
};



export const getCategoryName = async (req, res) => {
    try {
        const categories = await Category.find()
            .select("categoryName categoryUrl");
        if (!categories || categories.length === 0)
            return res
                .status(404)
                .json({ message: "Categories not found", success: false });
        return res.status(200).json({ categories });
    } catch (error) {
        console.log(error);
        res
            .status(500)
            .json({ message: "Failed to fetch categories", success: false });
    }
};

// Get all categories
export const getCategories = async (req, res) => {
    try {
        const categories = await Category.find().select("-categoryImage -categoryGif").sort({ rank: 1 });
        if (!categories) return res.status(404).json({ message: "Categories not found", success: false });
        return res.status(200).json({ categories });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Failed to fetch categories', success: false });
    }
};

// Get category by ID
export const getCategoryById = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const category = await Category.findById(categoryId);
        if (!category) return res.status(404).json({ message: "Category not found!", success: false });
        return res.status(200).json({ category, success: true });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Failed to fetch category', success: false });
    }
};

export const getCategoriesIds = async (req, res) => {
    try {
        const categories = await Category.find().select("categoryName categoryUrl");
        if (!categories)
            return res
                .status(404)
                .json({ message: "Categories not found", success: false });
        return res.status(200).json({ categories });
    } catch (error) {
        console.log(error);
        res
            .status(500)
            .json({ message: "Failed to fetch categories", success: false });
    }
};

export const getCategoryByUrl = async (req, res) => {
    try {
        const categoryUrl = req.params.id;
        const category = await Category.findOne({ categoryUrl }).select("-categoryImage -categoryGif");
        if (!category) return res.status(404).json({ message: "Category not found!", success: false });
        const services = await Service.find({ categoryId: category._id })
            .select('serviceName serviceUrl serviceDescription serviceImage serviceEnabled')
            .sort({ rank: 1 });
        return res.status(200).json({ category, services, success: true });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Failed to fetch category', success: false });
    }
};

// Update category by ID
export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { categoryName, imageBase64, categoryGif, rank, categoryDescription, userId, categoryUrl,
            seoTitle, seoDescription, } = req.body;

        const existingCategory = await Category.findById(id);
        if (!existingCategory) {
            return res.status(404).json({ message: "Category not found!", success: false });
        }

        // Initialize oldUrls array and add the previous serviceUrl if it's different
        let oldUrls = existingCategory.oldUrls || [];
        if (existingCategory.categoryUrl && existingCategory.categoryUrl !== categoryUrl && !oldUrls.includes(existingCategory.categoryUrl)) {
            oldUrls.push(existingCategory.categoryUrl);
        }

        // Validate base64 image data
        if (imageBase64 && !imageBase64.startsWith('data:image')) {
            return res.status(400).json({ message: 'Invalid image data', success: false });
        }



        const updatedData = {
            categoryName: req.body.name,
            categoryDescription: req.body.description,
            userId: req.body.userId,
            rank,
            categoryUrl,
            oldUrls,
            seoTitle, seoDescription,
            categoryGif,
            ...(imageBase64 && { categoryImage: imageBase64 }) // Only update image if new image is provided
        };

        const category = await Category.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
        if (!category) return res.status(404).json({ message: "Category not found!", success: false });
        return res.status(200).json({ category, success: true });
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: error.message, success: false });
    }
};

// Delete category by ID
export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await Category.findByIdAndDelete(id);
        if (!category) return res.status(404).json({ message: "Category not found!", success: false });
        return res.status(200).json({ category, success: true });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Failed to delete category', success: false });
    }
};


export const updateCategoryRank = async (req, res) => {
    try {
        const { id, direction } = req.body; // direction: 'up' or 'down'

        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found', success: false });
        }

        // Determine the target rank for the move
        let targetRank;
        if (direction === 'up') {
            targetRank = Number(category.rank) - 1;
        } else if (direction === 'down') {
            targetRank = Number(category.rank) + 1;
        }

        // Get the category to swap ranks with based on the target rank
        const targetCategory = await Category.findOne({ rank: targetRank });

        // Log if no category is found for the target rank
        if (!targetCategory) {
            return res.status(400).json({ message: 'Cannot move further in the specified direction', success: false });
        }

        // Swap the ranks between the two categories
        [category.rank, targetCategory.rank] = [targetCategory.rank, category.rank];

        // Save both categories with the new ranks
        await category.save();
        await targetCategory.save();

        res.status(200).json({ message: 'Rank updated successfully', success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating rank', success: false, error: error.message });
    }
};

export const getCategoryImageUrl = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const category = await Category.findById(categoryId).select("categoryImage");
        if (!category || !category.categoryImage) {
            return res.status(404).send('Image not found');
        }
        const matches = category.categoryImage.match(/^data:(.+);base64,(.+)$/);
        if (!matches) {
            return res.status(400).send('Invalid image format');
        }

        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');

        res.set('Content-Type', mimeType);
        res.send(buffer);

    } catch (err) {
        console.error('Image route error:', err);
        res.status(500).send('Error loading image');
    }

};

export const getCategoryGifUrl = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const category = await Category.findById(categoryId).select("categoryGif");
        if (!category || !category.categoryGif) {
            return res.status(404).send('Image not found');
        }
        const matches = category.categoryGif.match(/^data:(.+);base64,(.+)$/);
        if (!matches) {
            return res.status(400).send('Invalid image format');
        }

        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');

        res.set('Content-Type', mimeType);
        res.send(buffer);

    } catch (err) {
        console.error('Image route error:', err);
        res.status(500).send('Error loading image');
    }

};

export const getAllCategories = async (req, res) => {
    try {
        // Fetch only enabled services
        const categories = await Category.find()
            .select('categoryName categoryUrl categoryDescription')

        if (!categories.length) {
            return res.status(404).json({ message: 'No Categories found', success: false });
        }

        res.status(200).json({
            categories: categories,
            success: true,
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ message: 'Failed to fetch categories', success: false });
    }
};

