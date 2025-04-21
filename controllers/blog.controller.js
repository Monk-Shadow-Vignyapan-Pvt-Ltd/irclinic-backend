import { Blog } from "../models/blog.model.js";
import sharp from "sharp";

// Add a new Blog
export const addBlog = async (req, res) => {
  try {
    const {
      content,
      blogTitle,
      blogImage,
      blogDescription,
      blogUrl,
      seoTitle,
      seoDescription,
      userId,
      tags,
    } = req.body;
    // Validate blog content (e.g., check for base64 image or URL)
    if (!content || typeof content !== "string") {
      return res
        .status(400)
        .json({ message: "Invalid blog content", success: false });
    }

    const base64Data = blogImage.split(";base64,").pop();
    const buffer = Buffer.from(base64Data, "base64");

    // Resize and compress the image using sharp
    const compressedBuffer = await sharp(buffer)
      .resize(800, 600, { fit: "inside" }) // Resize to 800x600 max, maintaining aspect ratio
      .jpeg({ quality: 80 }) // Convert to JPEG with 80% quality
      .toBuffer();

    // Convert back to Base64 for storage (optional)
    const compressedBase64 = `data:image/jpeg;base64,${compressedBuffer.toString(
      "base64"
    )}`;

    // Save the blog in MongoDB
    const newBlog = new Blog({
      blogTitle,
      blogDescription,
      blogImage: compressedBase64,
      userId,
      blog: content, // Store the blog data (could be an image or text)
      blogUrl,
      seoTitle,
      tags,
      seoDescription,
    });

    await newBlog.save();
    res.status(201).json({ newBlog, success: true });
  } catch (error) {
    console.error("Error uploading blog:", error);
    res.status(500).json({ message: "Failed to upload blog", success: false });
  }
};

// Get all blogs
export const getBlogs = async (req, res) => {
  try {
    const { page = 1, search = "",tagID = "" } = req.query;
    const limit = 10;
    const skip = (page - 1) * limit;

    // Create a search filter
    const searchFilter = {};

    // Apply search filter
    if (search) {
      searchFilter.$or = [
        { blogTitle: { $regex: search, $options: "i" } },
        { blogDescription: { $regex: search, $options: "i" } },
      ];
    }

    if (tagID) {
      searchFilter["tags.value"] = tagID; // Check tagID in tags array
    }
    const allBlogs = await Blog.find(searchFilter);
    const paginatedBlogs = await Blog.find(searchFilter)
      .sort({ _id: -1 }) // Sort newest first
      .skip(skip)
      .limit(limit);
    if (!paginatedBlogs) {
      return res
        .status(404)
        .json({ message: "No blogs found", success: false });
    }
    res.status(200).json({
      blogs: paginatedBlogs,
      success: true,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(allBlogs.length / limit),
        totalCategories: allBlogs.length,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to fetch blogs", success: false });
  }
};

export const getRecentBlog = async (req, res) => {
  try {
    const allBlogs = await Blog.find()
      .sort({ _id: -1 })
      .limit(10)
      .select("blogTitle blogUrl");
    if (!allBlogs)
      return res
        .status(404)
        .json({ message: "allBlogs not found", success: false });
    return res.status(200).json({ allBlogs });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Failed to fetch allBlogs", success: false });
  }
};

// Get blog by ID
export const getBlogById = async (req, res) => {
  try {
    const blogId = req.params.id;
    const blog = await Blog.findById(blogId);
    if (!blog) {
      return res
        .status(404)
        .json({ message: "Blog not found", success: false });
    }
    return res.status(200).json({ blog, success: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to fetch blog", success: false });
  }
};

export const getBlogByUrl = async (req, res) => {
  try {
    const blogUrl = req.params.id;
    const blog = await Blog.findOne({ blogUrl });
    if (!blog)
      return res
        .status(404)
        .json({ message: "Blog not found!", success: false });
    return res.status(200).json({ blog, success: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to fetch Blog", success: false });
  }
};

// Update blog by ID
export const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      content,
      blogTitle,
      blogImage,
      blogDescription,
      blogUrl,
      tags,
      seoTitle,
      seoDescription,
      userId,
    } = req.body;

    // Validate blog content
    if (!content || typeof content !== "string") {
      return res
        .status(400)
        .json({ message: "Invalid blog content", success: false });
    }

    const base64Data = blogImage.split(";base64,").pop();
    const buffer = Buffer.from(base64Data, "base64");

    // Resize and compress the image using sharp
    const compressedBuffer = await sharp(buffer)
      .resize(800, 600, { fit: "inside" }) // Resize to 800x600 max, maintaining aspect ratio
      .jpeg({ quality: 80 }) // Convert to JPEG with 80% quality
      .toBuffer();

    // Convert back to Base64 for storage (optional)
    const compressedBase64 = `data:image/jpeg;base64,${compressedBuffer.toString(
      "base64"
    )}`;

    const updatedData = {
      blog: content,
      blogTitle,
      blogDescription,
      blogImage: compressedBase64,
      userId,
      blogUrl,
      tags,
      seoTitle,
      seoDescription,
    };

    const updatedBlog = await Blog.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });
    if (!updatedBlog) {
      return res
        .status(404)
        .json({ message: "Blog not found", success: false });
    }
    return res.status(200).json({ updatedBlog, success: true });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message, success: false });
  }
};

export const getBlogsFrontend = async (req, res) => {
  try {
    const blogs = await Blog.find().select("blogUrl");
    if (!blogs)
      return res
        .status(404)
        .json({ message: "Blogs not found", success: false });
    return res.status(200).json({ blogs });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to fetch blogs", success: false });
  }
};

// Delete blog by ID
export const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findByIdAndDelete(id);
    if (!blog) {
      return res
        .status(404)
        .json({ message: "Blog not found", success: false });
    }
    return res.status(200).json({ blog, success: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to delete blog", success: false });
  }
};
