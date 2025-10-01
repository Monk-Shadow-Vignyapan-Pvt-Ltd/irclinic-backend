import { Disease } from "../models/disease.model.js";
import cloudinary from "../utils/cloudinary.js";
import getDataUri from "../utils/datauri.js";
import sharp from "sharp";
import { Service } from '../models/service.model.js';

// Add a new disease
export const addDisease = async (req, res) => {
  try {
    const {
      diseaseName,
      diseaseDescription,
      symptomId,
      parentID,
      // rank,
      // imageBase64,
      userId,
      diseaseURL,
      seoTitle,
      seoDescription,
      schema
    } = req.body;
    // Validate base64 image data
    // if (!imageBase64 || !imageBase64.startsWith("data:image")) {
    //   return res
    //     .status(400)
    //     .json({ message: "Invalid image data", success: false });
    // }

    // const base64Data = imageBase64.split(";base64,").pop();
    // const buffer = Buffer.from(base64Data, "base64");

    // Resize and compress the image using sharp
    // const compressedBuffer = await sharp(buffer)
    //   .resize(800, 600, { fit: "inside" }) // Resize to 800x600 max, maintaining aspect ratio
    //   .jpeg({ quality: 80 }) // Convert to JPEG with 80% quality
    //   .toBuffer();

    // // Convert back to Base64 for storage (optional)
    // const compressedBase64 = `data:image/jpeg;base64,${compressedBuffer.toString(
    //   "base64"
    // )}`;

    // Save the disease details in MongoDB
    const disease = new Disease({
      diseaseName: req.body.name,
      // diseaseImage: compressedBase64, // Store the base64 string in MongoDB
      diseaseDescription: req.body.description,
      symptomId: req.body.symptomId,
      parentID: req.body.parentID,
      userId: req.body.userId,
      diseaseURL,
      seoTitle,
      seoDescription,
      schema,
      rank:99999
      // rank,
    });

    await disease.save();
    res.status(201).json({ disease, success: true });
  } catch (error) {
    console.error("Error uploading disease:", error);
    res
      .status(500)
      .json({ message: "Failed to upload disease", success: false });
  }
};

// Get all disease
export const getDiseases = async (req, res) => {
  const diseases = await Disease.find().select(
    "diseaseName rank diseaseDescription symptomId parentID  diseaseURL seoTitle seoDescription schema"
  ) .sort({
    rank: 1,            // first by rank
    diseaseName: 1      // then alphabetically (optional)
  });

  try {
    if (!diseases) {
      return res
        .status(404)
        .json({ message: "No diseases found", success: false });
    }

    res.status(200).json({
      diseases: diseases,
      success: true
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Failed to fetch disease", success: false });
  }
};

export const searchDiseases = async (req, res) => {
  try {
    const { search } = req.query;
    if (!search) {
      return res.status(400).json({ message: 'Search query is required', success: false });
    }

    const regex = new RegExp(search, 'i'); // Case-insensitive search

    const disease = await Disease.find({
      $or: [
        { diseaseName: regex },
      ]
    });

    if (!disease) {
      return res.status(404).json({ message: 'No disease found', success: false });
    }
    const page = parseInt(req.query.page) || 1;

    // Define the number of items per page
    const limit = 12;

    // Calculate the start and end indices for pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    // Paginate the reversed movies array
    const paginatedDiease = disease.slice(startIndex, endIndex);
    res.status(200).json({
      diseases: paginatedDiease,
      success: true,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(disease.length / limit),
        totalDiseases: disease.length,
      }
    });
  } catch (error) {
    console.error('Error searching diseases:', error);
    res.status(500).json({ message: 'Failed to search diseases', success: false });
  }
};

export const getDiseasesFrontend = async (req, res) => {
  try {
    const diseases = await Disease.aggregate([
      { $match: { $or: [{ parentID: null }, { parentID: "" }] } }, // Only parents
      { $sample: { size: 8 } }, // Random 8 diseases
      {
        $project: {
          diseaseName: 1,
          diseaseDescription: 1,
          symptomId: 1,
          parentID: 1,
          // diseaseImage: 1,
          diseaseURL: 1,
          seoTitle: 1,
          seoDescription: 1,
          schema: 1,
        },
      },
    ]);

    if (!diseases || diseases.length === 0) {
      return res
        .status(404)
        .json({ message: "Diseases not found", success: false });
    }

    return res.status(200).json({ diseases });
  } catch (error) {
    console.error("Error fetching diseases:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch diseases", success: false });
  }
};

export const getDiseaseName = async (req, res) => {
  try {
    // Get all diseases where parentID is an empty string
    const diseases = await Disease.find({ parentID: "" }).select(
      "_id diseaseName diseaseURL"
    );

    if (diseases.length === 0) {
      return res
        .status(404)
        .json({ message: "No diseases found", success: false });
    }

    return res.status(200).json({
      diseases: diseases,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching diseases:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch diseases", success: false });
  }
};

// Get disease by ID
export const getDiseaseById = async (req, res) => {
  try {
    const diseaseId = req.params.id;
    const disease = await Disease.findById(diseaseId);
    if (!disease)
      return res
        .status(404)
        .json({ message: "disease not found!", success: false });
    return res.status(200).json({ disease, success: true });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Failed to fetch disease", success: false });
  }
};

export const getDiseaseByUrl = async (req, res) => {
  try {
    const diseaseURL = req.params.id;
    const disease = await Disease.findOne({ diseaseURL }); // Populating category data
    if (!disease)
      return res
        .status(404)
        .json({ message: "Disease not found!", success: false });

    let parentDisease = null;
    if (disease.parentID) {
      parentDisease = await Disease.findOne({ diseaseName: disease.parentID });
    }



    const diseaseIdsToMatch = [disease._id.toString()];
    if (parentDisease) {
      diseaseIdsToMatch.push(parentDisease._id.toString());
    }

    // Find services where diseaseId array includes ANY of these IDs
    const services = await Service.find({
      diseaseId: {
        $elemMatch: {
          value: { $in: diseaseIdsToMatch },
        },
      },
    }).select(
      'serviceName serviceUrl serviceDescription serviceImage serviceEnabled'
    );
    return res.status(200).json({ disease, services, success: true });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Failed to fetch Disease", success: false });
  }
};

// Update disease by ID
export const updateDisease = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      diseaseName,
      // imageBase64,
      // rank,
      diseaseDescription,
      symptomId,
      parentID,
      userId,
      diseaseURL,
      seoTitle,
      seoDescription,
      schema
    } = req.body;

    const existingDisease = await Disease.findById(id);
    if (!existingDisease) {
      return res
        .status(404)
        .json({ message: "Disease not found!", success: false });
    }

    // Initialize oldUrls array and add the previous diseaseUrl if it's different
    let oldUrls = existingDisease.oldUrls || [];
    if (
      existingDisease.diseaseURL &&
      existingDisease.diseaseURL !== diseaseURL &&
      !oldUrls.includes(existingDisease.diseaseURL)
    ) {
      oldUrls.push(existingDisease.diseaseURL);
    }

    // Validate base64 image data
    // if (imageBase64 && !imageBase64.startsWith("data:image")) {
    //   return res
    //     .status(400)
    //     .json({ message: "Invalid image data", success: false });
    // }

    // const base64Data = imageBase64.split(";base64,").pop();
    // const buffer = Buffer.from(base64Data, "base64");

    // Resize and compress the image using sharp
    // const compressedBuffer = await sharp(buffer)
    //   .resize(800, 600, { fit: "inside" }) // Resize to 800x600 max, maintaining aspect ratio
    //   .jpeg({ quality: 80 }) // Convert to JPEG with 80% quality
    //   .toBuffer();

    // Convert back to Base64 for storage (optional)
    // const compressedBase64 = `data:image/jpeg;base64,${compressedBuffer.toString(
    //   "base64"
    // )}`;

    const updatedData = {
      diseaseName: req.body.name,
      diseaseDescription: req.body.description,
      symptomId: req.body.symptomId,
      userId: req.body.userId,
      parentID: req.body.parentID,
      // rank,
      diseaseURL,
      oldUrls,
      seoTitle,
      seoDescription,
      schema
      // ...(compressedBase64 && { diseaseImage: compressedBase64 }), // Only update image if new image is provided
    };

    const disease = await Disease.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });
    if (!disease)
      return res
        .status(404)
        .json({ message: "Disease not found!", success: false });
    return res.status(200).json({ disease, success: true });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message, success: false });
  }
};

// Delete disease by ID
export const deleteDisease = async (req, res) => {
  try {
    const { id } = req.params;
    const disease = await Disease.findByIdAndDelete(id);
    if (!disease)
      return res
        .status(404)
        .json({ message: "Disease not found!", success: false });
    return res.status(200).json({ disease, success: true });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Failed to delete disease", success: false });
  }
};

// export const updateDiseaseRank = async (req, res) => {
//   try {
//     const { id, direction } = req.body; // direction: 'up' or 'down'

//     const disease = await Disease.findById(id);
//     if (!disease) {
//       return res
//         .status(404)
//         .json({ message: "disease not found", success: false });
//     }

//     // Determine the target rank for the move
//     let targetRank;
//     if (direction === "up") {
//       targetRank = Number(disease.rank) - 1;
//     } else if (direction === "down") {
//       targetRank = Number(disease.rank) + 1;
//     }

//     // Get the disease to swap ranks with based on the target rank
//     const targetDisease = await Disease.findOne({ rank: targetRank });

//     // Log if no disease is found for the target rank
//     if (!targetDisease) {
//       return res.status(400).json({
//         message: "Cannot move further in the specified direction",
//         success: false,
//       });
//     }

//     // Swap the ranks between the two disease
//     [disease.rank, targetDisease.rank] = [targetDisease.rank, disease.rank];

//     // Save both disease with the new ranks
//     await disease.save();
//     await targetDisease.save();

//     res
//       .status(200)
//       .json({ message: "Rank updated successfully", success: true });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       message: "Error updating rank",
//       success: false,
//       error: error.message,
//     });
//   }
// };

export const getAllDiseases = async (req, res) => {
  const diseases = await Disease.find().select(
    "diseaseName diseaseDescription diseaseURL"
  );

  try {
    if (!diseases) {
      return res
        .status(404)
        .json({ message: "No diseases found", success: false });
    }

    res.status(200).json({
      diseases: diseases,
      success: true
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Failed to fetch disease", success: false });
  }
};

export const getDiseaseUrls = async (req, res) => {
  try {
    const disease = await Disease.find().select("diseaseURL")

    res.status(200).json({
      disease,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching disease:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch disease", success: false });
  }
};