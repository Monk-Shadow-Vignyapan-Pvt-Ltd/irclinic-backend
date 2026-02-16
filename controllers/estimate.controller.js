import { Estimate } from '../models/estimate.model.js'; // Update the path as per your project structure
import {Appointment} from '../models/appointment.model.js' ;
import { Patient } from '../models/patient.model.js'; 
import sharp from 'sharp';
import mongoose from 'mongoose';
import ExcelJS from 'exceljs';

// Add a new estimate
export const addEstimate = async (req, res) => {
    try {
        let { estimatePlan, appointmentId,patientId, userId, centerId, followups } = req.body;

        if (!estimatePlan) {
            return res.status(400).json({ message: 'Estimate plan is required', success: false });
        }

        

        // Function to process audio (convert Base64 to Buffer)
        const processAudio = (base64Audio) => {
            
            if (!base64Audio || typeof base64Audio !== "string") return null;
            const base64Data = base64Audio.split(';base64,').pop();
            return Buffer.from(base64Data, 'base64'); // Convert Base64 to Buffer
        };

        // Function to compress images
        const compressImage = async (base64Image) => {
            const base64Data = base64Image.split(';base64,').pop();
            const buffer = Buffer.from(base64Data, 'base64');
            const compressedBuffer = await sharp(buffer)
                .resize({ width: 1600, withoutEnlargement: true }) // resize only if larger
                .jpeg({ quality: 95 }) // higher quality
                .toBuffer();
            return `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
        };

        // Function to process images
        const compressAllImages = async (images) => {
            if (!Array.isArray(images)) return [];
            return await Promise.all(
                images.map(async (image) => {
                    try {
                        if (typeof image !== "string" || !image.startsWith('data:image')) return null;
                        return await compressImage(image);
                    } catch (err) {
                        console.error("Error compressing image:", err);
                        return null;
                    }
                })
            ).then(compressedImages => compressedImages.filter(img => img !== null)); // Remove null values
        };

        // Process both images & audio inside estimatePlan
        const processEstimatePlan = async (estimatePlan) => {
            if (!Array.isArray(estimatePlan)) return [];

            return await Promise.all(
                estimatePlan.map(async (plan) => {
                    // Process images
                    const compressedImages = Array.isArray(plan.images) ? await compressAllImages(plan.images) : [];

                    // Process audio
                    const processedAudio = plan.audio ? processAudio(plan.audio) : null;

                    return { 
                        ...plan, 
                        images: compressedImages, 
                        audio: processedAudio 
                    };
                })
            );
        };

        // Process estimatePlan
        estimatePlan = await processEstimatePlan(estimatePlan);

        // Save to MongoDB
        const estimate = new Estimate({ estimatePlan, appointmentId,patientId, userId, centerId, followups });
        await estimate.save();

        res.status(201).json({ estimate, success: true });
    } catch (error) {
        console.error('Error adding estimate:', error);
        res.status(500).json({ message: 'Failed to add estimate', success: false });
    }
};


// Get all estimates with pagination
export const getEstimates = async (req, res) => {
    try {
        const { id } = req.params;
        const estimates = await Estimate.find({centerId: id ,});
        if (!estimates ) {
            return res.status(404).json({ message: 'No estimates found', success: false });
        }
         const enhancedEstimates = await Promise.all(
            estimates.map(async (estimate) => {
                const estimateObj = estimate.toObject();

                if (estimate.appointmentId) {
                    const appointment = await Appointment.findById(estimate.appointmentId);
                    estimateObj.appointment = appointment;
                }

                if (estimate.patientId) {
                    const patient = await Patient.findById(estimate.patientId);
                    estimateObj.patient = patient;
                }

                return estimateObj;
            })
        );

                        const reversedestimates = enhancedEstimates.reverse();
                        const page = parseInt(req.query.page) || 1;
                
                        // Define the number of items per page
                        const limit = 12;
                
                        // Calculate the start and end indices for pagination
                        const startIndex = (page - 1) * limit;
                        const endIndex = page * limit;
                
                        // Paginate the reversed movies array
                        const paginatedestimates = reversedestimates.slice(startIndex, endIndex);
                        return res.status(200).json({ 
                            estimates:paginatedestimates, 
                            success: true ,
                            pagination: {
                            currentPage: page,
                            totalPages: Math.ceil(estimates.length / limit),
                            totalestimates: estimates.length,
                        },});
    } catch (error) {
        console.error('Error fetching estimates:', error);
        res.status(500).json({ message: 'Failed to fetch estimates', success: false });
    }
};

export const getEstimatesExcel = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    const search = req.query.search || "";
    const status = req.query.status || "";

    const filter = {};

    let patientIds = [];
    let appointmentIds = [];

    if (search) {
      const matchedPatients = await Patient.find({
        patientName: { $regex: search, $options: "i" },
      }).select("_id");

      patientIds = matchedPatients.map(p => p._id);

      const matchedAppointments = await Appointment.find({
        title: { $regex: search, $options: "i" },
      }).select("_id");

      appointmentIds = matchedAppointments.map(a => a._id);
    }

    const matchStage = {
      centerId: new mongoose.Types.ObjectId(id),
    };

    // 📅 Add date range condition
    const istOffset = 5.5 * 60 * 60000; // 5.5 hours in milliseconds

    if (startDate && endDate) {
      const start = new Date(new Date(startDate).setHours(0, 0, 0, 0) - istOffset);
      const end = new Date(new Date(endDate).setHours(23, 59, 59, 999) - istOffset);

      matchStage.createdAt = {
        $gte: start,
        $lte: end,
      };
    } else if (startDate) {
      const start = new Date(new Date(startDate).setHours(0, 0, 0, 0) - istOffset);
      matchStage.createdAt = { $gte: start };
    } else if (endDate) {
      const end = new Date(new Date(endDate).setHours(23, 59, 59, 999) - istOffset);
      matchStage.createdAt = { $lte: end };
    }

      const orConditions = [];

    if (patientIds.length) {
      orConditions.push({ patientId: { $in: patientIds } });
    }
    if (appointmentIds.length) {
      orConditions.push({ appointmentId: { $in: appointmentIds } });
    }

    if (search) {
      orConditions.push({
        "estimatePlan.procedureName": { $regex: search, $options: "i" },
      });
    }

    if (search) {
      orConditions.push({
        "estimatePlan.hospital.name": { $regex: search, $options: "i" },
      });
    }

    if (orConditions.length) {
      matchStage.$or = orConditions;
    }

    const basePipeline = [
      { $match: matchStage },
      ...(status
        ? [
            { $addFields: { lastFollowup: { $arrayElemAt: ["$followups", -1] } } },
            { $match: { "lastFollowup.followStatus": status } },
          ]
        : []),
    ];


   const estimates = await Estimate.aggregate([
      ...basePipeline,
      { $sort: { _id: -1 } },
      
    ]);

    // 🔁 Enrich with patient/appointment names
    const enhancedEstimates = await Promise.all(
  estimates.map(async (estimate) => {
    let patientName = null;

    // If appointmentId exists
    if (estimate.appointmentId) {
      const appointment = await Appointment.findById(estimate.appointmentId);
      if (appointment?.patientId) {
        const patient = await Patient.findById(appointment.patientId);
        patientName = patient?.patientName || null;
      }
    }

    // If direct patientId exists (priority override)
    if (!patientName && estimate.patientId) {
      const patient = await Patient.findById(estimate.patientId);
      patientName = patient?.patientName || null;
    }

    return {
      ...estimate,
      patientName,
    };
  })
);


    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Invoices');

    worksheet.columns = [
      { header: 'Est. DATE', key: 'createdAt', width: 20 },
      { header: 'PATIENT NAME', key: 'patientName', width: 30 },
      { header: 'HOSPITAL NAME', key: 'hospitalName', width: 30 },
      { header: 'GRAND TOTAL', key: 'grandTotal', width: 30 },
       { header: 'TOTAL DISCOUNT', key: 'totalDiscount', width: 30 },
      { header: 'Total AMOUNT', key: 'totalAmount', width: 15 },
       { header: 'STATUS', key: 'status', width: 15 },
       { header: 'Follow-ups', key: 'followups', width: 50 },
    ];

    for (const invoice of enhancedEstimates) {

      worksheet.addRow({
        createdAt: invoice?.createdAt
        ? new Date(invoice.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-')
        : '',
        patientName: invoice?.patientName || 'N/A',
        hospitalName: invoice?.estimatePlan?.length > 0 && invoice.estimatePlan[0]?.hospital
        ? invoice.estimatePlan[0].hospital.name
        : "",
        grandTotal:invoice?.estimatePlan.reduce((total, section) => total + (section.qty * section.cost), 0),
        totalDiscount: invoice?.estimatePlan.reduce((total, section) => total + section.discountAmount, 0),
        totalAmount:  invoice?.estimatePlan.reduce((total, section) => total + section.procedureTotal, 0),
        status:invoice.followups[invoice.followups.length - 1].followStatus,
         followups: invoice.followups
        ? invoice.followups.reverse().map(f => f.followupMessage).join(", ")
        : ""
      });
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=estimates${startDate || 'all'}_to_${endDate || 'all'}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('Excel Export Error:', err);
    res.status(500).json({ message: 'Failed to export orders', success: false });
  }
};

export const getPaginatedEstimates = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const search = req.query.search || "";
    const status = req.query.status || "";
    const startDate = req.query.startDate; // Format: 'YYYY-MM-DD'
    const endDate = req.query.endDate;     // Format: 'YYYY-MM-DD'
    const limit = 10;
    const skip = (page - 1) * limit;

    let patientIds = [];
    let appointmentIds = [];

    if (search) {
      const matchedPatients = await Patient.find({
        patientName: { $regex: search, $options: "i" },
      }).select("_id");

      patientIds = matchedPatients.map(p => p._id);

      const matchedAppointments = await Appointment.find({
        title: { $regex: search, $options: "i" },
      }).select("_id");

      appointmentIds = matchedAppointments.map(a => a._id);
    }

    const matchStage = {
      centerId: new mongoose.Types.ObjectId(id),
    };

    // 📅 Add date range condition
     const istOffset = 5.5 * 60 * 60000; // 5.5 hours in milliseconds
        if (startDate && endDate) {
      const start = new Date(new Date(startDate).setHours(0, 0, 0, 0) - istOffset);
      const end = new Date(new Date(endDate).setHours(23, 59, 59, 999) - istOffset);

      matchStage.createdAt = {
        $gte: start,
        $lte: end,
      };
    } else if (startDate) {
      const start = new Date(new Date(startDate).setHours(0, 0, 0, 0) - istOffset);
      matchStage.createdAt = { $gte: start };
    } else if (endDate) {
      const end = new Date(new Date(endDate).setHours(23, 59, 59, 999) - istOffset);
      matchStage.createdAt = { $lte: end };
    }


    const orConditions = [];

    if (patientIds.length) {
      orConditions.push({ patientId: { $in: patientIds } });
    }
    if (appointmentIds.length) {
      orConditions.push({ appointmentId: { $in: appointmentIds } });
    }

    if (search) {
      orConditions.push({
        "estimatePlan.procedureName": { $regex: search, $options: "i" },
      });
    }

    if (search) {
      orConditions.push({
        "estimatePlan.hospital.name": { $regex: search, $options: "i" },
      });
    }

    if (orConditions.length) {
      matchStage.$or = orConditions;
    }

    const basePipeline = [
      { $match: matchStage },
      ...(status
        ? [
            { $addFields: { lastFollowup: { $arrayElemAt: ["$followups", -1] } } },
            { $match: { "lastFollowup.followStatus": status } },
          ]
        : []),
    ];

    const estimates = await Estimate.aggregate([
      ...basePipeline,
      { $sort: { _id: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    const [totalEstimatesResult] = await Estimate.aggregate([
      ...basePipeline,
      { $count: "total" },
    ]);

    const totalEstimates = totalEstimatesResult?.total || 0;

    // 🔁 Enrich with patient/appointment names
    const enhancedEstimates = await Promise.all(
      estimates.map(async (estimate) => {
        if (estimate.appointmentId) {
          const appointment = await Appointment.findById(estimate.appointmentId);
          const patientApt = await Patient.findById(appointment.patientId);
          estimate.patientName = patientApt?.patientName || null;
        }

        if (estimate.patientId) {
          const patient = await Patient.findById(estimate.patientId);
          estimate.patientName = patient?.patientName || null;
        }

        return estimate;
      })
    );

    res.status(200).json({
      estimates: enhancedEstimates,
      success: true,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalEstimates / limit),
        totalEstimates,
      },
    });
  } catch (error) {
    console.error("Error fetching estimates:", error);
    res.status(500).json({ message: "Failed to fetch estimates", success: false });
  }
};





// Get estimate by ID
export const getEstimateById = async (req, res) => {
    try {
        const { id } = req.params;
        const estimate = await Estimate.findById(id);
        if (!estimate) {
            return res.status(404).json({ message: 'Estimate not found', success: false });
        }
        res.status(200).json({ estimate, success: true });
    } catch (error) {
        console.error('Error fetching estimate:', error);
        res.status(500).json({ message: 'Failed to fetch estimate', success: false });
    }
};

export const getEstimatesByPatientId = async (req, res) => {
    try {
        const { id } = req.params;
        const estimatesCount = await Estimate.countDocuments({patientId:id});
        res.status(200).json({ estimatesCount, success: true });
    } catch (error) {
        console.error('Error fetching estimates:', error);
        res.status(500).json({ message: 'Failed to fetch estimates', success: false });
    }
};

// Update estimate by ID
export const updateEstimate = async (req, res) => {
    try {
        const { id } = req.params;
        let { estimatePlan,appointmentId,patientId, userId, centerId ,followups} = req.body;

        // Function to process audio (convert Base64 to Buffer)
        const processAudio = (base64Audio) => {
            if (!base64Audio || typeof base64Audio !== "string") return null;
            const base64Data = base64Audio.split(';base64,').pop();
            return Buffer.from(base64Data, 'base64'); // Convert Base64 to Buffer
        };

        // Function to compress images
        const compressImage = async (base64Image) => {
            const base64Data = base64Image.split(';base64,').pop();
            const buffer = Buffer.from(base64Data, 'base64');
            const compressedBuffer = await sharp(buffer)
                .resize({ width: 1600, withoutEnlargement: true }) // resize only if larger
                .jpeg({ quality: 95 }) // higher quality
                .toBuffer();
            return `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
        };

        // Function to process images
        const compressAllImages = async (images) => {
            if (!Array.isArray(images)) return [];
            return await Promise.all(
                images.map(async (image) => {
                    try {
                        if (typeof image !== "string" || !image.startsWith('data:image')) return null;
                        return await compressImage(image);
                    } catch (err) {
                        console.error("Error compressing image:", err);
                        return null;
                    }
                })
            ).then(compressedImages => compressedImages.filter(img => img !== null)); // Remove null values
        };

        // Process both images & audio inside estimatePlan
        const processEstimatePlan = async (estimatePlan) => {
            if (!Array.isArray(estimatePlan)) return [];

            return await Promise.all(
                estimatePlan.map(async (plan) => {
                    // Process images
                    const compressedImages = Array.isArray(plan.images) ? await compressAllImages(plan.images) : [];

                    // Process audio
                    const processedAudio = plan.audio ? processAudio(plan.audio) : null;

                    return { 
                        ...plan, 
                        images: compressedImages, 
                        audio: processedAudio 
                    };
                })
            );
        };

        // Process estimatePlan
        estimatePlan = await processEstimatePlan(estimatePlan);
        
 
        const updatedData = { estimatePlan ,appointmentId,patientId, ...userId && { userId }, ...centerId && { centerId },followups };
        const estimate = await Estimate.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });

        if (!estimate) {
            return res.status(404).json({ message: 'Estimate not found', success: false });
        }
        res.status(200).json({ estimate, success: true });
    } catch (error) {
        console.error('Error updating estimate:', error);
        res.status(400).json({ message: 'Failed to update estimate', success: false });
    }
};

// Delete estimate by ID
export const deleteEstimate = async (req, res) => {
    try {
        const { id } = req.params;
        const estimate = await Estimate.findByIdAndDelete(id);
        if (!estimate) {
            return res.status(404).json({ message: 'Estimate not found', success: false });
        }
        res.status(200).json({ estimate, success: true });
    } catch (error) {
        console.error('Error deleting estimate:', error);
        res.status(500).json({ message: 'Failed to delete estimate', success: false });
    }
};

// Dashboard estimates
export const dashboardEstimates = async (req, res) => {
    try {
        const { id } = req.params;
        const totalEstimates = await Estimate.countDocuments({ centerId: id });
        const lastFiveEstimates = await Estimate.find({ centerId: id })
            .sort({ createdAt: -1 })
            .limit(5);

            const enhancedEstimates = await Promise.all(
            lastFiveEstimates.map(async (estimate) => {
                const estimateObj = estimate.toObject();

                if (estimate.appointmentId) {
                    const appointment = await Appointment.findById(estimate.appointmentId);
                    estimateObj.patientName = appointment?.title || null;
                }

                if (estimate.patientId) {
                    const patient = await Patient.findById(estimate.patientId);
                    estimateObj.patientName = patient?.patientName || null;
                }

                return estimateObj;
            })
        );

        res.status(200).json({ totalEstimates, estimates: enhancedEstimates });
    } catch (error) {
        console.error('Error fetching estimates:', error);
        res.status(500).json({ message: 'Failed to fetch estimates', success: false });
    }
};

// Search estimates
export const searchEstimates = async (req, res) => {
    try {
        const { id } = req.params;
        const { search } = req.query;
        if (!search) {
            return res.status(400).json({ message: 'Search query is required', success: false });
        }

        const regex = new RegExp(search, 'i');
        const estimates = await Estimate.find({centerId: id ,}); // Modify search fields if necessary

        res.status(200).json({
            estimates,
            success: true,
            pagination: {
                currentPage: 1,
                totalPages: Math.ceil(estimates.length / 12),
                totalEstimates: estimates.length,
            },
        });
    } catch (error) {
        console.error('Error searching estimates:', error);
        res.status(500).json({ message: 'Failed to search estimates', success: false });
    }
};
