import { Symptom } from "../models/symptoms.model.js";
import cloudinary from "../utils/cloudinary.js";
import getDataUri from "../utils/datauri.js";
import sharp from "sharp";
import { Service } from '../models/service.model.js';
import { Disease } from "../models/disease.model.js";

export const addSymptom = async (req, res) => {
  try {
    const {
      symptomName,
      symptomDescription,
      parentID,
      userId,
      symptomURL,
      seoTitle,
      seoDescription,
    } = req.body;

    const symptom = new Symptom({
      symptomName: req.body.name,
      symptomDescription: req.body.description,
      parentID: req.body.parentID,
      userId: req.body.userId,
      symptomURL,
      seoTitle,
      seoDescription,
      // rank,
    });

    await symptom.save();
    res.status(201).json({ symptom, success: true });
  } catch (error) {
    console.error("Error uploading symptom:", error);
    res
      .status(500)
      .json({ message: "Failed to upload symptom", success: false });
  }
};


export const getSymptoms = async (req, res) => {
  const symptom = await Symptom.find().select(
    "symptomName symptomDescription parentID  symptomURL seoTitle seoDescription"
  );

  try {
    if (!symptom) {
      return res
        .status(404)
        .json({ message: "No symptom found", success: false });
    }

    res.status(200).json({
      symptom: symptom,
      success: true
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Failed to fetch symptom", success: false });
  }
};

export const searchSymptom = async (req, res) => {
  try {
    const { search } = req.query;
    if (!search) {
      return res.status(400).json({ message: 'Search query is required', success: false });
    }

    const regex = new RegExp(search, 'i'); // Case-insensitive search

    const symptom = await Symptom.find({
      $or: [
        { symptomName: regex },
      ]
    });

    if (!symptom) {
      return res.status(404).json({ message: 'No symptom found', success: false });
    }
    const page = parseInt(req.query.page) || 1;

    // Define the number of items per page
    const limit = 12;

    // Calculate the start and end indices for pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    // Paginate the reversed movies array
    const paginatedSymptom = symptom.slice(startIndex, endIndex);
    res.status(200).json({
      symptomps: paginatedSymptom,
      success: true,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(symptom.length / limit),
        totalSymptom: symptom.length,
      }
    });
  } catch (error) {
    console.error('Error searching symptom:', error);
    res.status(500).json({ message: 'Failed to search symptom', success: false });
  }
};

export const getSymptomFrontend = async (req, res) => {
  try {
    const symptom = await Symptom.aggregate([
      { $match: { $or: [{ parentID: null }, { parentID: "" }] } }, // Only parents
      { $sample: { size: 8 } }, // Random 8 symptom
      {
        $project: {
          symptomName: 1,
          symptomDescription: 1,
          parentID: 1,
          // symptomImage: 1,
          symptomURL: 1,
          seoTitle: 1,
          seoDescription: 1,
        },
      },
    ]);

    if (!symptom || symptom.length === 0) {
      return res
        .status(404)
        .json({ message: "Symptom not found", success: false });
    }

    return res.status(200).json({ symptom });
  } catch (error) {
    console.error("Error fetching symptom:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch symptom", success: false });
  }
};

export const getSymptomName = async (req, res) => {
  try {
    // Get all symptom where parentID is an empty string
    const symptom = await Symptom.find({}).select(
      "_id symptomName symptomURL"
    );

    if (symptom.length === 0) {
      return res
        .status(404)
        .json({ message: "No symptom found", success: false });
    }

    return res.status(200).json({
      symptom: symptom,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching symptom:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch symptom", success: false });
  }
};

// Get symptom by ID
export const getSymptomById = async (req, res) => {
  try {
    const symptomId = req.params.id;
    const symptom = await Symptom.findById(symptomId);
    if (!symptom)
      return res
        .status(404)
        .json({ message: "symptom not found!", success: false });
    return res.status(200).json({ symptom, success: true });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Failed to fetch symptom", success: false });
  }
};

export const getSymptomByUrl = async (req, res) => {
  try {
    const symptomURL = req.params.id;
    const symptom = await Symptom.findOne({ symptomURL }); // Populating category data
    if (!symptom)
      return res
        .status(404)
        .json({ message: "Symptom not found!", success: false });

    let parentSymptom = null;
    if (symptom.parentID) {
      parentSymptom = await Symptom.findOne({ symptomName: symptom.parentID });
    }



    const symptomIdsToMatch = [symptom._id.toString()];
    if (parentSymptom) {
      symptomIdsToMatch.push(parentSymptom._id.toString());
    }

    const dieases = await Disease.find({
      symptomId: {
        $elemMatch: {
          value: { $in: symptomIdsToMatch },
        },
      },
    }).select(
      'diseaseName diseaseDescription parentID parentID description rank'
    );

    const services = await Service.find({
      symptomId: {
        $elemMatch: {
          value: { $in: symptomIdsToMatch },
        },
      },
    }).select(
      'serviceName serviceUrl serviceDescription serviceImage serviceEnabled'
    );
    return res.status(200).json({ symptom, services, dieases, success: true });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Failed to fetch Symptom", success: false });
  }
};

// Update symptom by ID
export const updateSymptom = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      symptomName,
      // imageBase64,
      // rank,
      symptomDescription,
      parentID,
      userId,
      symptomURL,
      seoTitle,
      seoDescription,
    } = req.body;

    const existingSymptom = await Symptom.findById(id);
    if (!existingSymptom) {
      return res
        .status(404)
        .json({ message: "Symptom not found!", success: false });
    }

    // Initialize oldUrls array and add the previous symptomUrl if it's different
    let oldUrls = existingSymptom.oldUrls || [];
    if (
      existingSymptom.symptomURL &&
      existingSymptom.symptomURL !== symptomURL &&
      !oldUrls.includes(existingSymptom.symptomURL)
    ) {
      oldUrls.push(existingSymptom.symptomURL);
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
      symptomName: req.body.name,
      symptomDescription: req.body.description,
      userId: req.body.userId,
      parentID: req.body.parentID,
      // rank,
      symptomURL,
      oldUrls,
      seoTitle,
      seoDescription,
      // ...(compressedBase64 && { symptomImage: compressedBase64 }), // Only update image if new image is provided
    };

    const symptom = await Symptom.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });
    if (!symptom)
      return res
        .status(404)
        .json({ message: "Symptom not found!", success: false });
    return res.status(200).json({ symptom, success: true });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message, success: false });
  }
};

// Delete symptom by ID
export const deleteSymptom = async (req, res) => {
  try {
    const { id } = req.params;
    const symptom = await Symptom.findByIdAndDelete(id);
    if (!symptom)
      return res
        .status(404)
        .json({ message: "Symptom not found!", success: false });
    return res.status(200).json({ symptom, success: true });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Failed to delete symptom", success: false });
  }
};

// export const updateSymptomRank = async (req, res) => {
//   try {
//     const { id, direction } = req.body; // direction: 'up' or 'down'

//     const symptom = await Symptom.findById(id);
//     if (!symptom) {
//       return res
//         .status(404)
//         .json({ message: "symptom not found", success: false });
//     }

//     // Determine the target rank for the move
//     let targetRank;
//     if (direction === "up") {
//       targetRank = Number(symptom.rank) - 1;
//     } else if (direction === "down") {
//       targetRank = Number(symptom.rank) + 1;
//     }

//     // Get the symptom to swap ranks with based on the target rank
//     const targetSymptom = await Symptom.findOne({ rank: targetRank });

//     // Log if no symptom is found for the target rank
//     if (!targetSymptom) {
//       return res.status(400).json({
//         message: "Cannot move further in the specified direction",
//         success: false,
//       });
//     }

//     // Swap the ranks between the two symptom
//     [symptom.rank, targetSymptom.rank] = [targetSymptom.rank, symptom.rank];

//     // Save both symptom with the new ranks
//     await symptom.save();
//     await targetSymptom.save();

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
