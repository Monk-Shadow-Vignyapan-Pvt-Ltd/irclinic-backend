import { VendorInvoice } from "../models/vendorInvoice.model.js";

// Add a new Vendor Invoice
export const addVendorInvoice = async (req, res) => {
  try {
    const { invoiceImage, approveStatus, vendorId, userId, centerId } = req.body;

    const newInvoice = new VendorInvoice({
      invoiceImage,
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

    const updatedData = {
      invoiceImage,
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
