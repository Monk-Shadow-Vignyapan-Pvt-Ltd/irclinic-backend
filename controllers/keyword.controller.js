import { Keyword } from "../models/keyword.model.js";

// Add a new Keyword
export const addKeyword = async (req, res) => {
  try {
    const { keywordName } = req.body;

    const newKeyword = new Keyword({
      keywordName,
    });

    await newKeyword.save();

    res.status(201).json({ keyword: newKeyword, success: true });
  } catch (error) {
    console.error("Error adding keyword:", error);
    res.status(500).json({ message: "Failed to add keyword", success: false });
  }
};

// Get all keywords
export const getKeywords = async (req, res) => {
  try {
    const keywords = await Keyword.find();

    return res.status(200).json({ keywords, success: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to fetch keywords", success: false });
  }
};

// Get keyword by ID
export const getKeywordById = async (req, res) => {
  try {
    const { id } = req.params;

    const keyword = await Keyword.findById(id);

    if (!keyword) {
      return res.status(404).json({ message: "Keyword not found", success: false });
    }

    return res.status(200).json({ keyword, success: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to fetch keyword", success: false });
  }
};

// Update keyword by ID
export const updateKeyword = async (req, res) => {
  try {
    const { id } = req.params;
    const { keywordName } = req.body;

    const updatedKeyword = await Keyword.findByIdAndUpdate(
      id,
      { keywordName },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedKeyword) {
      return res.status(404).json({ message: "Keyword not found", success: false });
    }

    return res.status(200).json({ keyword: updatedKeyword, success: true });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message, success: false });
  }
};

// Delete keyword by ID
export const deleteKeyword = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedKeyword = await Keyword.findByIdAndDelete(id);

    if (!deletedKeyword) {
      return res.status(404).json({ message: "Keyword not found", success: false });
    }

    return res.status(200).json({ keyword: deletedKeyword, success: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to delete keyword", success: false });
  }
};