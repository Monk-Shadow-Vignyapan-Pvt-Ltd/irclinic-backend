import { AdminDoctor } from "../models/admin_doctor.model.js";
import { AdminDoctorSearch } from "../models/admin_doctor_search.model.js";
import sharp from "sharp";

// Add a new doctor
export const addDoctor = async (req, res) => {
  try {
    let {
      doctorName,
      doctorDescription,
      doctorImage,
      altText,
      doctorPhone,
      doctorEmail,
      speciality,
      doctorDegree,
      doctorTraining,
      doctorUrl,
      fbUrl,
      instaUrl,
      linkedinUrl,
      oldUrls,
      seoTitle,
      seoDescription,
      schema,
      userId,
    } = req.body;

    // Validate base64 image data
    if (!doctorName || !doctorImage.startsWith("data:image")) {
      return res
        .status(400)
        .json({ message: "Invalid image data", success: false });
    }

    const compressImage = async (base64Image) => {
      const base64Data = base64Image.split(";base64,").pop();
      const buffer = Buffer.from(base64Data, "base64");
      const compressedBuffer = await sharp(buffer)
        .resize(800, 600, { fit: "inside" }) // Resize to 800x600 max, maintaining aspect ratio
        .jpeg({ quality: 80 }) // Convert to JPEG with 80% quality
        .toBuffer();
      return `data:image/jpeg;base64,${compressedBuffer.toString("base64")}`;
    };

    // Compress the main doctor image
    const compressedDoctorBase64 = await compressImage(doctorImage);


    const doctor = new AdminDoctor({
      doctorName,
      doctorDescription,
      doctorImage: compressedDoctorBase64, // Store the base64 image data
      altText,
      doctorPhone,
      doctorEmail,
      speciality,
      doctorDegree,
      doctorTraining,
      doctorUrl,
      fbUrl,
      instaUrl,
      linkedinUrl,
      oldUrls,
      seoTitle,
      seoDescription,
      schema,
      userId,
    });

    await doctor.save();
    res.status(201).json({ doctor, success: true });
  } catch (error) {
    console.error("Error uploading doctor:", error);
    res
      .status(500)
      .json({ message: "Failed to upload doctor", success: false });
  }
};

export const getDoctors = async (req, res) => {
  try {
    const doctors = await AdminDoctor.find().select(
      "doctorName doctorDescription doctorImage doctorPhone doctorEmail speciality doctorDegree doctorTraining doctorUrl fbUrl instaUrl linkedinUrl oldUrls seoTitle seoDescription"
    );
    if (!doctors) {
      return res
        .status(404)
        .json({ message: "No doctors found", success: false });
    }
    const reversedDoctors = doctors.reverse();
    const page = parseInt(req.query.page) || 1;

    // Define the number of items per page
    const limit = 12;

    // Calculate the start and end indices for pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    // Paginate the reversed movies array
    const paginatedDoctors = reversedDoctors.slice(startIndex, endIndex);
    res.status(200).json({
      doctors: paginatedDoctors,
      success: true,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(doctors.length / limit),
        totaldoctors: doctors.length,
      },
    });
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch doctors", success: false });
  }
};

export const getWebDoctors = async (req, res) => {
  try {
    const doctors = await AdminDoctor.find().select(
      "doctorName doctorDescription altText doctorPhone doctorEmail speciality doctorDegree doctorTraining doctorUrl fbUrl instaUrl linkedinUrl oldUrls seoTitle seoDescription"
    );
    if (!doctors) {
      return res
        .status(404)
        .json({ message: "No doctors found", success: false });
    }
    const reversedDoctors = doctors.reverse();
    const page = parseInt(req.query.page) || 1;

    // Define the number of items per page
    const limit = 12;

    // Calculate the start and end indices for pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    // Paginate the reversed movies array
    const paginatedDoctors = reversedDoctors.slice(startIndex, endIndex);
    res.status(200).json({
      doctors: paginatedDoctors,
      success: true,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(doctors.length / limit),
        totaldoctors: doctors.length,
      },
    });
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch doctors", success: false });
  }
};

export const searchDoctors = async (req, res) => {
  try {
    const { search } = req.query;
    if (!search) {
      return res
        .status(400)
        .json({ message: "Search query is required", success: false });
    }

    const regex = new RegExp(search, "i"); // Case-insensitive search

    const doctors = await AdminDoctor.find({
      $or: [{ doctorName: regex }],
    });

    if (!doctors) {
      return res
        .status(404)
        .json({ message: "No doctors found", success: false });
    }
    const page = parseInt(req.query.page) || 1;

    // Define the number of items per page
    const limit = 12;

    // Calculate the start and end indices for pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    // Paginate the reversed movies array
    const paginatedDoctors = doctors.slice(startIndex, endIndex);
    res.status(200).json({
      doctors: paginatedDoctors,
      success: true,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(doctors.length / limit),
        totalDoctors: doctors.length,
      },
    });
  } catch (error) {
    console.error("Error searching Doctors:", error);
    res
      .status(500)
      .json({ message: "Failed to search Doctors", success: false });
  }
};

// Get doctor by ID
export const getDoctorById = async (req, res) => {
  try {
    const doctorId = req.params.id;
    const doctor = await AdminDoctor.findById(doctorId);
    if (!doctor)
      return res
        .status(404)
        .json({ message: "doctor not found!", success: false });
    return res.status(200).json({ doctor, success: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to fetch doctor", success: false });
  }
};

export const getDoctorByUrl = async (req, res) => {
  try {
    const doctorUrl = req.params.id;
    const doctor = await AdminDoctor.findOne({ doctorUrl });
    if (!doctor)
      return res
        .status(404)
        .json({ message: "doctor not found!", success: false });
    return res.status(200).json({ doctor, success: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to fetch doctor", success: false });
  }
};

// Update doctor by ID
export const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    let {
      doctorName,
      doctorDescription,
      doctorImage,
      altText,
      doctorPhone,
      doctorEmail,
      speciality,
      doctorDegree,
      doctorTraining,
      fbUrl,
      instaUrl,
      linkedinUrl,
      doctorUrl,
      seoTitle,
      seoDescription,
      schema,
      userId
    } = req.body;

    const existingDoctor = await AdminDoctor.findById(id);
    if (!existingDoctor) {
      return res
        .status(404)
        .json({ message: "doctor not found!", success: false });
    }

    // Initialize oldUrls array and add the previous doctorUrl if it's different
    let oldUrls = existingDoctor.oldUrls || [];
    if (
      existingDoctor.doctorUrl &&
      existingDoctor.doctorUrl !== doctorUrl &&
      !oldUrls.includes(existingDoctor.doctorUrl)
    ) {
      oldUrls.push(existingDoctor.doctorUrl);
    }
    // Validate base64 image data
    if (doctorImage && !doctorImage.startsWith("data:image")) {
      return res
        .status(400)
        .json({ message: "Invalid image data", success: false });
    }

    const compressImage = async (base64Image) => {
      const base64Data = base64Image.split(";base64,").pop();
      const buffer = Buffer.from(base64Data, "base64");
      const compressedBuffer = await sharp(buffer)
        .resize(800, 600, { fit: "inside" }) // Resize to 800x600 max, maintaining aspect ratio
        .jpeg({ quality: 80 }) // Convert to JPEG with 80% quality
        .toBuffer();
      return `data:image/jpeg;base64,${compressedBuffer.toString("base64")}`;
    };

    // Compress the main Doctor image
    const compressedDoctorBase64 = await compressImage(doctorImage);

    const updatedData = {
      doctorName,
      doctorDescription,
      ...(compressedDoctorBase64 && { doctorImage: compressedDoctorBase64 }), // Only update image if new image is provided
      altText,
      doctorUrl,
      doctorPhone,
      doctorEmail,
      speciality,
      doctorDegree,
      doctorTraining,
      fbUrl,
      instaUrl,
      linkedinUrl,
      seoTitle,
      seoDescription,
      schema,
      userId,
      oldUrls,
    };

    const doctor = await AdminDoctor.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });
    if (!doctor)
      return res
        .status(404)
        .json({ message: "doctor not found!", success: false });
    return res.status(200).json({ doctor, success: true });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message, success: false });
  }
};


// Delete doctor by ID
export const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const doctor = await AdminDoctor.findByIdAndDelete(id);
    if (!doctor)
      return res
        .status(404)
        .json({ message: "doctor not found!", success: false });
    return res.status(200).json({ doctor, success: true });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Failed to delete doctor", success: false });
  }
};

export const getDoctorsFrontend = async (req, res) => {
  try {
    const doctors = await AdminDoctor.find()
      .select(
        "doctorName doctorDescription doctorImage doctorPhone doctorEmail speciality doctorDegree doctorTraining doctorUrl fbUrl instaUrl linkedinUrl seoDescription seoTitle schema"
      )

    if (!doctors)
      return res
        .status(404)
        .json({ message: "doctors not found", success: false });
    return res.status(200).json({ doctors });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Failed to fetch doctors", success: false });
  }
};


// Clone doctor by ID
function createUrl(name) {
  return name
    .trim() // Remove extra spaces
    .toLowerCase() // Convert to lowercase
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, ""); // Remove special characters except hyphens
}

export const cloneDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the doctor to clone
    const doctorToClone = await AdminDoctor.findById(id);
    if (!doctorToClone) {
      return res
        .status(404)
        .json({ message: "Doctor to clone not found!", success: false });
    }

    // Remove the _id field to avoid duplication error
    const clonedData = { ...doctorToClone.toObject() };
    delete clonedData._id;

    // Generate a new unique doctorName
    let newDoctorName = doctorToClone.doctorName;
    let newDoctorUrl = doctorToClone.doctorUrl;
    let suffix = 1;

    while (await AdminDoctor.findOne({ doctorName: newDoctorName })) {
      suffix++;
      newDoctorName = `${doctorToClone.doctorName}-${suffix}`;
      newDoctorUrl = createUrl();
    }

    clonedData.doctorName = newDoctorName;
    clonedData.doctorUrl = newDoctorUrl;

    // Create a new doctor with the cloned data
    const clonedDoctor = new doctor(clonedData);
    await clonedDoctor.save();

    return res.status(201).json({ clonedDoctor, success: true });
  } catch (error) {
    console.error("Error cloning doctor:", error);
    res
      .status(500)
      .json({ message: "Failed to clone doctor", success: false });
  }
};

export const getDoctorInSearch = async (req, res) => {
  try {
    const doctorRankings = await AdminDoctorSearch.find();
    if (!doctorRankings)
      return res
        .status(404)
        .json({ message: "doctor Rankings not found", success: false });
    return res.status(200).json({ doctorRankings });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Failed to fetch doctor Rankings", success: false });
  }
};

export const getDoctorUrls = async (req, res) => {
  try {
    const adminDoctor = await AdminDoctor.find().select("doctorUrl")

    res.status(200).json({
      adminDoctor,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching Doctor:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch Doctor", success: false });
  }
};

export const getDoctorImage = async (req, res) => {
  try {
    const doctorId = req.params.id;
    const doctor = await AdminDoctor.findById(doctorId).select('doctorImage');
    if (!doctor) return res.status(404).json({ message: "Doctor not found!", success: false });
    const matches = doctor.doctorImage.match(/^data:(.+);base64,(.+)$/);
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
    res.status(500).json({ message: 'Failed to fetch Doctor image', success: false });
  }
};