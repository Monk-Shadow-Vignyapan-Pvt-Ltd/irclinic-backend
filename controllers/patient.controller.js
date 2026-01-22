import { Patient } from '../models/patient.model.js'; // Update the path as per your project structure
import { Appointment } from '../models/appointment.model.js';
import { Estimate } from '../models/estimate.model.js';
import { Center } from '../models/center.model.js'; // You'll need this model
import { City } from '../models/city.model.js'; // You'll need this model
import { State } from '../models/state.model.js'; // You'll need this model

const generateCaseId = async (centerId, patientType, cityName = null) => {
  try {
    const center = await Center.findById(centerId);
    if (!center) throw new Error("Center not found");

    // IST-safe date
    const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const formattedDate = istNow
      .toLocaleDateString("en-GB")
      .replace(/\//g, "");

    let stateCode, cityCode, centerCode, sequenceNumber = 1;
    centerCode = center.centerCode;

    let lastPatient;

    if (patientType === "OPD") {
      stateCode = center.stateCode;
      cityCode = center.cityCode;

      lastPatient = await Patient.findOne({
        centerId,
        patientType: "OPD",
      })
        .sort({ createdAt: -1 })
        .select("caseId");

    } else if (patientType === "Outside") {
      if (!cityName) throw new Error("City name is required");

      const city = await City.findOne({ cityName });
      if (!city) throw new Error("City not found");

      const state = await State.findById(city.stateId);
      if (!state) throw new Error("State not found");

      stateCode = state.stateCode;
      cityCode = city.cityCode;

      lastPatient = await Patient.findOne({
        centerId,
        patientType: "Outside",
      })
        .sort({ createdAt: -1 })
        .select("caseId");

    } else {
      throw new Error("Invalid patient type");
    }

    if (lastPatient?.caseId) {
      const lastSeq = lastPatient.caseId.split("-").pop();
      sequenceNumber = parseInt(lastSeq, 10) + 1;
    }

    const paddedSeq = sequenceNumber.toString().padStart(7, "0");

    if (patientType === "OPD") {
      return `${stateCode}-${cityCode}-${centerCode}-${formattedDate}-${paddedSeq}`;
    }

    return `${stateCode}-${cityCode}-${centerCode}-O-${formattedDate}-${paddedSeq}`;
  } catch (err) {
    console.error("Error generating caseId:", err);
    throw err;
  }
};



// Add a new patient
export const addPatient = async (req, res) => {
    try {
        const { patientName, gender, phoneNo,alterphoneNo, age, address,fromCamp, patientType, reference, centerId,state,city,area,diagnosis, userId } = req.body;

        // Validate required fields
        if (!patientName || !gender  || !patientType) {
            return res.status(400).json({ message: 'All required fields must be filled', success: false });
        }

           let caseId;
                try {
                caseId = await generateCaseId(centerId, patientType, patientType === "Outside" ? city : null);
                } catch (error) {
                return res.status(400).json({ message: error.message, success: false });
                }

        // Create a new patient
        const patient = new Patient({
            patientName,
            gender,
            phoneNo,
            alterphoneNo,
            age,
            address,
            fromCamp,
            patientType,
            reference,
            centerId:(centerId === '')  ? null:centerId,
            state,
            city,
            caseId,
            area,
            diagnosis,
            userId
        });

        await patient.save();
        res.status(201).json({ patient, success: true });
    } catch (error) {
        console.error('Error adding patient:', error);
        res.status(500).json({ message: error.message, success: false });
    }
};

// Get all patients
export const getOPDPatients = async (req, res) => {
    try {
        const { id } = req.params;
        const patients = await Patient.find({ centerId: id,patientType:"OPD" });
        if (!patients) {
            return res.status(404).json({ message: 'No patients found', success: false });
        }
        //const outsidePatients = patients.filter(patient => patient.patientType === "Outside")
        const reversedpatients = patients.reverse();
        const page = parseInt(req.query.page) || 1;

        // Define the number of items per page
        const limit = 12;

        // Calculate the start and end indices for pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        // Paginate the reversed movies array
        const paginatedpatients = reversedpatients.slice(startIndex, endIndex);
        return res.status(200).json({ 
            patients:paginatedpatients, 
            success: true ,
            pagination: {
            currentPage: page,
            totalPages: Math.ceil(patients.length / limit),
            totalpatients: patients.length,
        },});
    } catch (error) {
        console.error('Error fetching patients:', error);
        res.status(500).json({ message: 'Failed to fetch patients', success: false });
    }
};

export const getOutSidePatients = async (req, res) => {
    try {
        const { id } = req.params;
        const patients = await Patient.find({ centerId: id,patientType:"Outside" });
        if (!patients) {
            return res.status(404).json({ message: 'No patients found', success: false });
        }
        const outsidePatients = patients.filter(patient => patient.patientType === "Outside")
        const reversedpatients = patients.reverse();
        const page = parseInt(req.query.page) || 1;

        // Define the number of items per page
        const limit = 12;

        // Calculate the start and end indices for pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        // Paginate the reversed movies array
        const paginatedpatients = reversedpatients.slice(startIndex, endIndex);
        return res.status(200).json({ 
            patients:paginatedpatients, 
            outsidePatients:outsidePatients,
            success: true ,
            pagination: {
            currentPage: page,
            totalPages: Math.ceil(patients.length / limit),
            totalpatients: patients.length,
        },});
    } catch (error) {
        console.error('Error fetching patients:', error);
        res.status(500).json({ message: 'Failed to fetch patients', success: false });
    }
};

export const getCampPatients = async (req, res) => {
    try {
        const { id } = req.params;
        const patients = await Patient.find({ centerId: id,patientType:"OPD",fromCamp:true }).sort({ createdAt: -1 });;
        if (!patients) {
            return res.status(404).json({ message: 'No patients found', success: false });
        }
        
        return res.status(200).json({
            patients: patients,
            success: true,
            pagination: {
                currentPage: 1,
                totalPages: Math.ceil(patients.length / 12),
                totalPatients: patients.length,
            },
        });
    } catch (error) {
        console.error('Error fetching patients:', error);
        res.status(500).json({ message: 'Failed to fetch patients', success: false });
    }
};

export const getAllPatients = async (req, res) => {
    try {
        const { id } = req.params;
        const patients = await Patient.find({ centerId: id });
        if (!patients) {
            return res.status(404).json({ message: 'No patients found', success: false });
        }
        
        return res.status(200).json({ 
            patients:patients, 
            success: true ,
            });
    } catch (error) {
        console.error('Error fetching patients:', error);
        res.status(500).json({ message: 'Failed to fetch patients', success: false });
    }
};

export const getPatientsByCenterId = async (req, res) => {
    try {
        const { id } = req.params;
        const patients = await Patient.find({ centerId: id });
        if (!patients) {
            return res.status(404).json({ message: 'Patients not found', success: false });
        }
        res.status(200).json({ patients, success: true });
    } catch (error) {
        console.error('Error fetching patients:', error);
        res.status(500).json({ message: 'Failed to fetch patients', success: false });
    }
};

// Get patient by ID
export const getPatientById = async (req, res) => {
    try {
        const { id } = req.params;
        const patient = await Patient.findById(id);
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found', success: false });
        }
        res.status(200).json({ patient, success: true });
    } catch (error) {
        console.error('Error fetching patient:', error);
        res.status(500).json({ message: 'Failed to fetch patient', success: false });
    }
};

// Update patient by ID
export const updatePatient = async (req, res) => {
    try {
        const { id } = req.params;
        const { patientName, gender, phoneNo,alterphoneNo, age, address,fromCamp, patientType, reference,visitHistory, centerId,state,city,area,diagnosis, userId } = req.body;

    //       const existingPatient = await Patient.findById(id);
    // if (!existingPatient) {
    //   return res.status(404).json({ message: 'Patient not found', success: false });
    // }

    //  let caseId = existingPatient.caseId;
    // if (patientType && patientType !== existingPatient.patientType) {
    //   try {
    //     caseId = await generateCaseId(
    //       existingPatient.centerId, 
    //       patientType, 
    //       patientType === "Outside" ? city : null
    //     );
    //   } catch (error) {
    //     return res.status(400).json({ message: error.message, success: false });
    //   }
    // }

        // Build updated data
        const updatedData = {
            ...(patientName && { patientName }),
            ...(gender && { gender }),
            ...(phoneNo && { phoneNo }),
            ...(alterphoneNo && { alterphoneNo }),
            ...(age && { age }),
            ...(address && { address }),
            fromCamp,
            ...(patientType && { patientType }),
            ...(reference && { reference }),
            ...(visitHistory && { visitHistory }),
            centerId: (centerId === "") ? null : centerId ,
            ...(state && { state }),
            ...(city && { city }),
            ...(caseId && { caseId }),
            ...(area && { area }),
            ...(diagnosis && { diagnosis }),
            ...(userId && { userId }),
        };

        const patient = await Patient.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found', success: false });
        }
        res.status(200).json({ patient, success: true });
    } catch (error) {
        console.error('Error updating patient:', error);
        res.status(400).json({ message: error.message, success: false });
    }
};

// Delete patient by ID
export const deletePatient = async (req, res) => {
    try {
        const { id } = req.params;
        const patient = await Patient.findByIdAndDelete(id);
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found', success: false });
        }
        res.status(200).json({ patient, success: true });
    } catch (error) {
        console.error('Error deleting patient:', error);
        res.status(500).json({ message: 'Failed to delete patient', success: false });
    }
};

export const dashboardPatients = async (req, res) => {
    try {
        const { id } = req.params;
        const totalPatients = await Patient.countDocuments({ centerId: id }); // Get total count

        const lastFivePatients = await Patient.find({ centerId: id }, { patientName: 1, _id: 1 }) // Select only patientName
            .sort({ createdAt: -1 }) // Sort by creation date (descending)
            .limit(5); // Get last 5 Patients

        return res.status(200).json({ 
            totalPatients, 
            patients: lastFivePatients 
        });
    } catch (error) {
        console.error('Error fetching Patients:', error);
        res.status(500).json({ message: 'Failed to fetch Patients', success: false });
    }
};

export const searchOPDPatients = async (req, res) => {
    try {
        const { id } = req.params;
        const { search } = req.query;
        if (!search) {
            return res.status(400).json({ message: 'Search query is required', success: false });
        }

        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        // Replace spaces with ".*" so it matches anything between words
        const regex = new RegExp(escapedSearch.replace(/\s+/g, ".*"), "i");

        const patients = await Patient.find({
            centerId: id,
            patientType:"OPD",
            $or: [
                { patientName: regex },
                { gender: regex },
                { phoneNo: regex },
                { caseId: regex },
                { age: regex },
                { city: regex },
                { state: regex },
                { address: regex },
                { "reference.label": regex },
                { "area.label": regex },
                { "diagnosis.label": regex },
            ]
        });

        const estimates = await Estimate.find({
            centerId: id,
            $or: [
                { "estimatePlan.hospital.name": regex }, 
            ]
        });

        // Extract all estimateId values
        const estimateIds = estimates.map(est => est._id);

        // If no estimates found, short-circuit
        // if (!estimateIds.length) {
        //     return res.status(404).json({ message: 'No matching estimates found', success: false });
        // }

        // Find appointments with those estimateIds
        const appointments = await Appointment.find({
                centerId: id,
                $or: [
                    { estimateId: { $in: estimateIds } },
                    {
                    progressNotes: {
                        $elemMatch: {
                        progressNote: {
                            $elemMatch: {
                            value: regex
                            }
                        }
                        }
                    }
                    }
                ]
                });


        const patientIds = appointments.map(apt => apt.patientId);

         const hospitalPatients = await Patient.find({
            centerId: id,
            patientType:"OPD",
            _id: { $in: patientIds }
        });

        const filterPatients = [...patients,...hospitalPatients];

        if (!filterPatients) {
            return res.status(404).json({ message: 'No patients found', success: false });
        }

        return res.status(200).json({
            patients: filterPatients,
            success: true,
            pagination: {
                currentPage: 1,
                totalPages: Math.ceil(filterPatients.length / 12),
                totalPatients: filterPatients.length,
            },
        });
    } catch (error) {
        console.error('Error searching patients:', error);
        res.status(500).json({ message: 'Failed to search patients', success: false });
    }
};

export const searchOutSidePatients = async (req, res) => {
    try {
        const { id } = req.params;
        const { search } = req.query;
        if (!search) {
            return res.status(400).json({ message: 'Search query is required', success: false });
        }

        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        // Replace spaces with ".*" so it matches anything between words
        const regex = new RegExp(escapedSearch.replace(/\s+/g, ".*"), "i");

        const patients = await Patient.find({
            centerId: id,
            patientType:"Outside",
            $or: [
                { patientName: regex },
                { gender: regex },
                { phoneNo: regex },
                { age: regex },
                { city: regex },
                { state: regex },
                { address: regex },
                { caseId: regex },
                { "reference.label": regex },
                { "area.label": regex },
                { "diagnosis.label": regex },
                { "visitHistory.hospital.label": regex }, 
            ]
        });

        const estimates = await Estimate.find({
            centerId: id,
            $or: [
                { "estimatePlan.hospital.name": regex }, 
            ]
        });

        // Extract all estimateId values
        const estimateIds = estimates.map(est => est._id);

        // If no estimates found, short-circuit
        // if (!estimateIds.length) {
        //     return res.status(404).json({ message: 'No matching estimates found', success: false });
        // }

        // Find appointments with those estimateIds
        const appointments = await Appointment.find({
            centerId: id,
            $or: [
                { estimateId: { $in: estimateIds } },
                {
                progressNotes: {
                    $elemMatch: {
                    progressNote: {
                        $elemMatch: {
                        value: regex
                        }
                    }
                    }
                }
                }
            ]
            });


        const patientIds = appointments.map(apt => apt.patientId);

         const hospitalPatients = await Patient.find({
            centerId: id,
            patientType:"Outside",
            _id: { $in: patientIds }
        });

        const filterPatients = [...patients,...hospitalPatients];

        if (!filterPatients) {
            return res.status(404).json({ message: 'No patients found', success: false });
        }

        return res.status(200).json({
            patients: filterPatients,
            success: true,
            pagination: {
                currentPage: 1,
                totalPages: Math.ceil(filterPatients.length / 12),
                totalPatients: filterPatients.length,
            },
        });
    } catch (error) {
        console.error('Error searching patients:', error);
        res.status(500).json({ message: 'Failed to search patients', success: false });
    }
};

export const searchCampPatients = async (req, res) => {
    try {
        const { id } = req.params;
        const { search } = req.query;
        if (!search) {
            return res.status(400).json({ message: 'Search query is required', success: false });
        }

        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        // Replace spaces with ".*" so it matches anything between words
        const regex = new RegExp(escapedSearch.replace(/\s+/g, ".*"), "i");

        const patients = await Patient.find({
            centerId: id,
            patientType:"OPD",
            fromCamp:true,
            $or: [
                { patientName: regex },
                { gender: regex },
                { phoneNo: regex },
                { caseId: regex },
                { age: regex },
                { city: regex },
                { state: regex },
                { address: regex },
                { "reference.label": regex },
                { "area.label": regex },
                { "diagnosis.label": regex },
            ]
        });

        const estimates = await Estimate.find({
            centerId: id,
            $or: [
                { "estimatePlan.hospital.name": regex }, 
            ]
        });

        // Extract all estimateId values
        const estimateIds = estimates.map(est => est._id);

        // If no estimates found, short-circuit
        // if (!estimateIds.length) {
        //     return res.status(404).json({ message: 'No matching estimates found', success: false });
        // }

        // Find appointments with those estimateIds
        const appointments = await Appointment.find({
            centerId: id,
            $or: [
                { estimateId: { $in: estimateIds } },
                {
                progressNotes: {
                    $elemMatch: {
                    progressNote: {
                        $elemMatch: {
                        value: regex
                        }
                    }
                    }
                }
                }
            ]
            });


        const patientIds = appointments.map(apt => apt.patientId);

         const hospitalPatients = await Patient.find({
            centerId: id,
            patientType:"OPD",
            _id: { $in: patientIds }
        });

        const filterPatients = [...patients,...hospitalPatients];

        if (!filterPatients) {
            return res.status(404).json({ message: 'No patients found', success: false });
        }

        return res.status(200).json({
            patients: filterPatients,
            success: true,
            pagination: {
                currentPage: 1,
                totalPages: Math.ceil(filterPatients.length / 12),
                totalPatients: filterPatients.length,
            },
        });
    } catch (error) {
        console.error('Error searching patients:', error);
        res.status(500).json({ message: 'Failed to search patients', success: false });
    }
};

// Clone patient to another center
export const clonePatientToCenter = async (req, res) => {
  try {
    const { patientId, targetCenterId, userId } = req.body;

    if (!patientId || !targetCenterId) {
      return res.status(400).json({
        success: false,
        message: "patientId and targetCenterId are required"
      });
    }

    // 1️⃣ Find source patient
    const sourcePatient = await Patient.findById(patientId);
    if (!sourcePatient) {
      return res.status(404).json({
        success: false,
        message: "Source patient not found"
      });
    }

    // 2️⃣ Prevent cloning into same center
    if (sourcePatient.centerId.toString() === targetCenterId) {
      return res.status(400).json({
        success: false,
        message: "Patient already belongs to this center"
      });
    }

    // 3️⃣ Check if patient already exists in target center
    const existingPatient = await Patient.findOne({
      phoneNo: sourcePatient.phoneNo,
      centerId: targetCenterId
    });

    if (existingPatient) {
      return res.status(400).json({
        success: false,
        message:
          "Patient with same phone number already exists in target center"
      });
    }

    // 4️⃣ Create cloned patient
    const clonedPatient = new Patient({
      patientName: sourcePatient.patientName,
      gender: sourcePatient.gender,
      phoneNo: sourcePatient.phoneNo,
      alterphoneNo: sourcePatient.alterphoneNo,
      age: sourcePatient.age,
      address: sourcePatient.address,
      fromCamp: sourcePatient.fromCamp,
      patientType: sourcePatient.patientType,
      reference: sourcePatient.reference,
      visitHistory: sourcePatient.visitHistory,

      // 🔁 CHANGE CENTER
      centerId: targetCenterId,

      state: sourcePatient.state,
      city: sourcePatient.city,

      // 🔐 NEW CASE ID
      caseId: sourcePatient.caseId,

      area: sourcePatient.area,
      diagnosis: sourcePatient.diagnosis,

      userId: userId || sourcePatient.userId
    });

    await clonedPatient.save();

    return res.status(201).json({
      success: true,
      message: "Patient cloned successfully",
      patient: clonedPatient
    });

  } catch (error) {
    console.error("Error cloning patient:", error);

    // 🔒 Handle duplicate key (safety)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          "Patient with same phone number already exists in target center"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to clone patient"
    });
  }
};

export const searchPatient = async (req, res) => {
  try {
    const { search } = req.body;

    if (!search) {
      return res.status(400).json({
        success: false,
        message: "Search query is required"
      });
    }

    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const exactRegex = new RegExp(`^${escapedSearch}$`, "i");

    // 1️⃣ Try exact phone match first
    let patient = await Patient.findOne({
      phoneNo: exactRegex
    }).sort({ createdAt: -1 });

    // 2️⃣ If not found, try caseId
    if (!patient) {
      patient = await Patient.findOne({
        caseId: exactRegex
      }).sort({ createdAt: -1 });
    }

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found"
      });
    }

    return res.status(200).json({
      success: true,
      patient
    });

  } catch (error) {
    console.error("Error searching patient:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to search patient"
    });
  }
};


