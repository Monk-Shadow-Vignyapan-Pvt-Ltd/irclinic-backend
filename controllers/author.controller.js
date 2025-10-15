import { Author } from "../models/author.model.js"; // ✅ Update path as per your structure

// ➕ Add a new author
export const addAuthor = async (req, res) => {
  try {
    const { name, bio, authorUrl } = req.body;

    // Validate required field
    if (!name) {
      return res.status(400).json({ message: "Author name is required", success: false });
    }

    // Create new author
    const newAuthor = new Author({ name, bio, authorUrl });
    await newAuthor.save();

    res.status(201).json({ author: newAuthor, success: true });
  } catch (error) {
    console.error("Error adding author:", error);
    res.status(500).json({ message: "Failed to add author", success: false });
  }
};

// 📜 Get all authors
export const getAuthors = async (req, res) => {
  try {
    const authors = await Author.find().sort({ createdAt: -1 }); // latest first
    res.status(200).json({ authors, success: true });
  } catch (error) {
    console.error("Error fetching authors:", error);
    res.status(500).json({ message: "Failed to fetch authors", success: false });
  }
};

// 🔍 Get author by ID
export const getAuthorById = async (req, res) => {
  try {
    const { id } = req.params;
    const author = await Author.findById(id);

    if (!author) {
      return res.status(404).json({ message: "Author not found", success: false });
    }

    res.status(200).json({ author, success: true });
  } catch (error) {
    console.error("Error fetching author:", error);
    res.status(500).json({ message: "Failed to fetch author", success: false });
  }
};

// ✏️ Update author by ID
export const updateAuthor = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, bio, authorUrl } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Author name is required", success: false });
    }

    const updatedAuthor = await Author.findByIdAndUpdate(
      id,
      { name, bio, authorUrl },
      { new: true, runValidators: true }
    );

    if (!updatedAuthor) {
      return res.status(404).json({ message: "Author not found", success: false });
    }

    res.status(200).json({ author: updatedAuthor, success: true });
  } catch (error) {
    console.error("Error updating author:", error);
    res.status(400).json({ message: "Failed to update author", success: false });
  }
};

// 🗑️ Delete author by ID
export const deleteAuthor = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedAuthor = await Author.findByIdAndDelete(id);

    if (!deletedAuthor) {
      return res.status(404).json({ message: "Author not found", success: false });
    }

    res.status(200).json({ author: deletedAuthor, success: true });
  } catch (error) {
    console.error("Error deleting author:", error);
    res.status(500).json({ message: "Failed to delete author", success: false });
  }
};
