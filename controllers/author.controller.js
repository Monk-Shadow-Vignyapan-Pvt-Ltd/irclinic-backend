import { Author } from "../models/author.model.js"; // ✅ Update path as per your structure
import sharp from "sharp";
// ➕ Add a new author
export const addAuthor = async (req, res) => {
  try {
    const { name, bio,authorImage, authorUrl } = req.body;

    // Validate required field
    if (!name) {
      return res.status(400).json({ message: "Author name is required", success: false });
    }

    let compressedBase64 = "";
        if(authorImage){
          const base64Data = authorImage.split(';base64,').pop();
          const buffer = Buffer.from(base64Data, 'base64');
    
          // Resize and compress the image using sharp
          const compressedBuffer = await sharp(buffer)
              .resize(800, 600, { fit: 'inside' }) // Resize to 800x600 max, maintaining aspect ratio
              .jpeg({ quality: 80 }) // Convert to JPEG with 80% quality
              .toBuffer();
    
          // Convert back to Base64 for storage (optional)
           compressedBase64 = `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
        }

    // Create new author
    const newAuthor = new Author({ name, bio, authorUrl, authorImage:authorImage ? compressedBase64 : authorImage});
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
    const authors = await Author.find().select("-authorImage").sort({ createdAt: -1 }); // latest first
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
    const author = await Author.findById(id).select("-authorImage");

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
    const { name, bio, authorUrl,authorImage } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Author name is required", success: false });
    }

    let compressedBase64 = "";
        if(authorImage){
          const base64Data = authorImage.split(';base64,').pop();
          const buffer = Buffer.from(base64Data, 'base64');
    
          // Resize and compress the image using sharp
          const compressedBuffer = await sharp(buffer)
              .resize(800, 600, { fit: 'inside' }) // Resize to 800x600 max, maintaining aspect ratio
              .jpeg({ quality: 80 }) // Convert to JPEG with 80% quality
              .toBuffer();
    
          // Convert back to Base64 for storage (optional)
           compressedBase64 = `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
        }

    const updatedAuthor = await Author.findByIdAndUpdate(
      id,
      { name, bio, authorUrl,authorImage:authorImage ? compressedBase64 : authorImage },
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

export const getAuthorImage = async (req, res) => {
  try {
    const authorId = req.params.id;
    const author = await Author.findById(authorId).select('authorImage');
    if (!author) return res.status(404).json({ message: "author not found!", success: false });
    const matches = author.authorImage.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).send('Invalid image format');
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    res.set('Content-Type', mimeType);
    res.send(buffer);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Failed to fetch author image', success: false });
  }
};
