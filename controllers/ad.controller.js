import { Ad } from '../models/ad.model.js'; // Update the path as per your project structure
import axios from "axios";
import ExcelJS from 'exceljs';

// Add a new ad
export const addAd = async (req, res) => {
  try {
    const {
      patientName,
      patientEmail,
      patientPhone,
      centerId,
    } = req.body;

    // Validate required fields
    if (!patientName || !patientPhone) {
      return res.status(400).json({
        message: "Patient name and phone are required",
        success: false,
      });
    }

    // Last 7 days date
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Check if same patient phone already exists
    // for the same center within the last 7 days
    const existingAd = await Ad.findOne({
      patientPhone,
      centerId,
      createdAt: {
        $gte: sevenDaysAgo,
      },
    });

    if (existingAd) {
      return res.status(201).json({
        message: "An ad for this patient has already been added within the last 7 days",
        success: true,
        ad: existingAd,
      });
    }

    // Create new ad
    const newAd = new Ad({
      patientName,
      patientEmail,
      patientPhone,
      centerId,
    });

    await newAd.save();

    res.status(201).json({
      ad: newAd,
      success: true,
    });
  } catch (error) {
    console.error("Error adding ad:", error);

    res.status(500).json({
      message: "Failed to add ad",
      success: false,
    });
  }
};

// Get all ads
export const getAds = async (req, res) => {
  try {
    const { id } = req.params;

    // Pagination
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);
    const skip = (page - 1) * limit;

    // Search
    const search = req.query.search?.trim() || "";

    // Base filter
    const filter = {
      centerId: id,
    };

    // Search
    if (search) {
      filter.$or = [
        { patientName: { $regex: search, $options: "i" } },
        { patientEmail: { $regex: search, $options: "i" } },
        { patientPhone: { $regex: search, $options: "i" } },
        { paymentId: { $regex: search, $options: "i" } },
        { paymentStatus: { $regex: search, $options: "i" } },
        { paymentMode: { $regex: search, $options: "i" } },
      ];
    }

    // Total records
    const totalAds = await Ad.countDocuments(filter);

    // Paginated records
    const ads = await Ad.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Call payment API only when merchantTxnNo exists
    const adsWithPaymentStatus = await Promise.all(
      ads.map(async (ad) => {
        // No merchantTxnNo → don't call API
        if (!ad.merchantTxnNo) {
          return ad;
        }

        try {
          const response = await axios.post(
            "https://api.interventionalradiology.co.in/api/v1/auth/checkAdPaymentStatus",
            {
              merchantTxnNo: ad.merchantTxnNo,
            }
          );

          return {
            ...ad,
            paymentStatus: response.data?.paymentStatus,
          };
        } catch (error) {
          console.error(
            `Payment status failed for ${ad.merchantTxnNo}:`,
            error?.response?.data || error.message
          );

          return ad;
        }
      })
    );

    res.status(200).json({
      ads: adsWithPaymentStatus,
      success: true,
      pagination: {
        total: totalAds,
        page,
        limit,
        totalPages: Math.ceil(totalAds / limit),
        hasNextPage: page < Math.ceil(totalAds / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching ads:", error);

    res.status(500).json({
      message: "Failed to fetch ads",
      success: false,
    });
  }
};

// Get ad by ID
export const getAdById = async (req, res) => {
  try {
    const { id } = req.params;
    const ad = await Ad.findById(id);
    if (!ad) {
      return res.status(404).json({ message: 'Ad not found', success: false });
    }
    res.status(200).json({ ad, success: true });
  } catch (error) {
    console.error('Error fetching ad:', error);
    res.status(500).json({ message: 'Failed to fetch ad', success: false });
  }
};

// Update ad by ID
export const updateAd = async (req, res) => {
  try {
    const { id } = req.params;
    const { patientName, patientEmail, patientPhone, centerId } = req.body;

    // Build updated data
    const updatedData = {
      ...(patientName && { patientName }),
      ...(patientEmail && { patientEmail }),
      ...(patientPhone && { patientPhone }),
      ...(centerId && { centerId }),
    };

    const updatedAd = await Ad.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });
    if (!updatedAd) {
      return res.status(404).json({ message: 'Ad not found', success: false });
    }
    res.status(200).json({ ad: updatedAd, success: true });
  } catch (error) {
    console.error('Error updating ad:', error);
    res.status(400).json({ message: 'Failed to update ad', success: false });
  }
};

// Delete ad by ID
export const deleteAd = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedAd = await Ad.findByIdAndDelete(id);
    if (!deletedAd) {
      return res.status(404).json({ message: 'Ad not found', success: false });
    }
    res.status(200).json({ ad: deletedAd, success: true });
  } catch (error) {
    console.error('Error deleting ad:', error);
    res.status(500).json({ message: 'Failed to delete ad', success: false });
  }
};

export const downloadAdsExcel = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    // Validate required date fields
    if (!startDate || !endDate) {
      return res.status(400).json({
        message: 'Please provide startDate and endDate in query params (YYYY-MM-DD)',
        success: false
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include end of the day

    // Fetch ads within the date range
    const ads = await Ad.find({
        centerId: id,
      createdAt: { $gte: start, $lte: end }
    }).sort({ createdAt: -1 });

    if (ads.length === 0) {
      return res.status(404).json({ message: 'No ads found in this date range', success: false });
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Ads');

    // Add header row
    worksheet.columns = [
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Payment Status', key: 'paymentStatus', width: 20 },
      { header: 'Created At', key: 'createdAt', width: 20 }
    ];

    // Add data rows
    ads.forEach(ad => {
      worksheet.addRow({
        name: ad.patientName,
        phone: ad.patientPhone,
        email: ad.patientEmail,
        amount: ad.paymentAmount,
        paymentStatus: ad.paymentStatus,
        createdAt: ad.createdAt.toISOString().split('T')[0]
      });
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=ads_${startDate}_to_${endDate}.xlsx`);

    // Write to response stream
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating Excel:', error);
    res.status(500).json({ message: 'Failed to generate Excel', success: false });
  }
};
