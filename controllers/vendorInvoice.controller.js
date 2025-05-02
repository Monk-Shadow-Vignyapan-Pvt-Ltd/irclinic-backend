import { VendorInvoice } from "../models/vendorInvoice.model.js";
import sharp from 'sharp';

export const addVendorInvoice = async (req, res) => {
  try {
    const { invoiceImage, approveStatus, vendorId, userId, centerId } = req.body;

    if (!invoiceImage || !invoiceImage.startsWith('data:image')) {
      return res.status(400).json({ message: 'Invalid image data', success: false });
    }

    // Extract MIME type from the Base64 string
    const mimeMatch = invoiceImage.match(/^data:(image\/(png|jpeg|jpg|webp));base64,/);
    if (!mimeMatch) {
      return res.status(400).json({ message: 'Unsupported image format', success: false });
    }

    const mimeType = mimeMatch[1]; // full MIME type like "image/png"
    const format = mimeMatch[2];   // file extension like "png", "jpeg", etc.
    const base64Data = invoiceImage.split(';base64,').pop();
    const buffer = Buffer.from(base64Data, 'base64');

    let compressedBuffer;

    // Use sharp to compress and preserve format
    const image = sharp(buffer).resize(800, 600, { fit: 'inside' });

    if (format === 'jpeg' || format === 'jpg') {
      compressedBuffer = await image.jpeg({ quality: 80 }).toBuffer();
    } else if (format === 'png') {
      compressedBuffer = await image.png({ compressionLevel: 8 }).toBuffer();
    } else if (format === 'webp') {
      compressedBuffer = await image.webp({ quality: 80 }).toBuffer();
    } else {
      return res.status(400).json({ message: 'Unsupported image format', success: false });
    }

    const compressedBase64 = `data:${mimeType};base64,${compressedBuffer.toString('base64')}`;

    const newInvoice = new VendorInvoice({
      invoiceImage: compressedBase64,
      approveStatus,
      vendorId,
      userId,
      centerId,
    });

    await newInvoice.save();
    res.status(201).json({ invoice: newInvoice, success: true });
  } catch (error) {
    console.error("Error uploading vendor invoice:", error);
    res.status(500).json({ message: "Failed to upload vendor invoice", success: false });
  }
};


// Get all Vendor Invoices
export const getVendorInvoices = async (req, res) => {
    try {
      const { id } = req.params;
      const { page = 1, vendor = "" } = req.query;
      const limit = 10;
      const skip = (page - 1) * limit;
  
      // Create a search filter
      const searchFilter = {};
      if (vendor) {
        searchFilter.vendorId = vendor;
      }
  
      // Total matching invoices (no pagination)
      const totalInvoices = await VendorInvoice.countDocuments({ centerId: id, ...searchFilter });
  
      // Paginated invoices
      const paginatedInvoices = await VendorInvoice.find({ centerId: id, ...searchFilter })
        .sort({ _id: -1 }) // Sort newest first
        .skip(skip)
        .limit(limit);
  
      res.status(200).json({
        invoices: paginatedInvoices,
        success: true,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalInvoices / limit),
          totalInvoices,
        },
      });
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices", success: false });
    }
  };
  

// Get Vendor Invoice by ID
export const getVendorInvoiceById = async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const invoice = await VendorInvoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found", success: false });
    }
    return res.status(200).json({ invoice, success: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to fetch invoice", success: false });
  }
};

export const getVendorInvoicesByVendorId = async (req, res) => {
    try {
        const { id: vendorId } = req.params;
        const { centerId, page = 1 } = req.query;

        if (!centerId) {
            return res.status(400).json({ message: 'centerId is required', success: false });
        }

        // Find matching stockouts
        const invoices = await VendorInvoice.find({
            vendorId,
            centerId,
        });

        if (!invoices) {
            return res.status(404).json({ message: 'No invoices found', success: false });
        }

        const filteredInvoices = invoices.reverse();

        const limit = 12;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

        return res.status(200).json({
            invoices: paginatedInvoices,
            success: true,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(filteredInvoices.length / limit),
                totalInvoices: filteredInvoices.length,
            },
        });
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ message: 'Failed to fetch invoices', success: false });
    }
};

// Update Vendor Invoice by ID
export const updateVendorInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { invoiceImage, approveStatus, vendorId, userId, centerId } = req.body;
    if (!invoiceImage || !invoiceImage.startsWith('data:image')) {
        return res.status(400).json({ message: 'Invalid image data', success: false });
      }
  
      // Extract MIME type from the Base64 string
      const mimeMatch = invoiceImage.match(/^data:(image\/(png|jpeg|jpg|webp));base64,/);
      if (!mimeMatch) {
        return res.status(400).json({ message: 'Unsupported image format', success: false });
      }
  
      const mimeType = mimeMatch[1]; // full MIME type like "image/png"
      const format = mimeMatch[2];   // file extension like "png", "jpeg", etc.
      const base64Data = invoiceImage.split(';base64,').pop();
      const buffer = Buffer.from(base64Data, 'base64');
  
      let compressedBuffer;
  
      // Use sharp to compress and preserve format
      const image = sharp(buffer).resize(800, 600, { fit: 'inside' });
  
      if (format === 'jpeg' || format === 'jpg') {
        compressedBuffer = await image.jpeg({ quality: 80 }).toBuffer();
      } else if (format === 'png') {
        compressedBuffer = await image.png({ compressionLevel: 8 }).toBuffer();
      } else if (format === 'webp') {
        compressedBuffer = await image.webp({ quality: 80 }).toBuffer();
      } else {
        return res.status(400).json({ message: 'Unsupported image format', success: false });
      }
  
      const compressedBase64 = `data:${mimeType};base64,${compressedBuffer.toString('base64')}`;

    const updatedData = {
      invoiceImage:compressedBase64,
      approveStatus,
      vendorId,
      userId,
      centerId,
    };

    const updatedInvoice = await VendorInvoice.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });

    if (!updatedInvoice) {
      return res.status(404).json({ message: "Invoice not found", success: false });
    }
    return res.status(200).json({ invoice: updatedInvoice, success: true });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message, success: false });
  }
};

// Delete Vendor Invoice by ID
export const deleteVendorInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedInvoice = await VendorInvoice.findByIdAndDelete(id);
    if (!deletedInvoice) {
      return res.status(404).json({ message: "Invoice not found", success: false });
    }
    return res.status(200).json({ invoice: deletedInvoice, success: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to delete invoice", success: false });
  }
};
