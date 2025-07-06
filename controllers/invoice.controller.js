import { Invoice } from '../models/invoice.model.js'; // Update the path as per your project structure
import { Appointment } from '../models/appointment.model.js';
import { Patient } from '../models/patient.model.js';
import { Center } from '../models/center.model.js';
import { chromium } from 'playwright';
import moment from 'moment';
import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import { User } from '../models/user.model.js';

// Add a new invoice
export const addInvoice = async (req, res) => {
  try {
    const { invoicePlan, appointmentId, userId, centerId } = req.body;

    // Validate required fields
    if (!invoicePlan) {
      return res.status(400).json({ message: 'Invoice plan is required', success: false });
    }

    // Create a new invoice
    const invoice = new Invoice({
      invoicePlan,
      appointmentId,
      userId,
      centerId
    });

    await invoice.save();
    res.status(201).json({ invoice, success: true });
  } catch (error) {
    console.error('Error adding invoice:', error);
    res.status(500).json({ message: 'Failed to add invoice', success: false });
  }
};

// Get all invoices
export const getInvoices = async (req, res) => {
  try {
    const { id } = req.params;
    const invoices = await Invoice.find({ centerId: id });
    if (!invoices) {
      return res.status(404).json({ message: 'No invoices found', success: false });
    }
    const enhancedInvoices = await Promise.all(
      invoices.map(async (invoice) => {
        if (invoice.appointmentId) {
          const appointment = await Appointment.findOne({ _id: invoice.appointmentId });
          return { ...invoice.toObject(), appointment }; // Convert Mongoose document to plain object
        }
        return invoice.toObject(); // If no invoiceId, return appointment as-is
      })
    );
    const reversedinvoices = enhancedInvoices.reverse();
    const page = parseInt(req.query.page) || 1;

    // Define the number of items per page
    const limit = 12;

    // Calculate the start and end indices for pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    // Paginate the reversed movies array
    const paginatedinvoices = reversedinvoices.slice(startIndex, endIndex);
    return res.status(200).json({
      invoices: paginatedinvoices,
      success: true,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(invoices.length / limit),
        totalinvoices: invoices.length,
      },
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ message: 'Failed to fetch invoices', success: false });
  }
};

export const getInvoicesExcel = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const filter = {};

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

    const basePipeline = [{ $match: matchStage }];

    const invoices = await Invoice.aggregate([
      ...basePipeline,
      { $sort: { _id: -1 } },
    ]);

    // 🔁 Enrich with patient/appointment names
    const enhancedInvoices = await Promise.all(
      invoices.map(async (invoice) => {
        if (invoice.appointmentId) {
          const appointment = await Appointment.findById(invoice.appointmentId);
          invoice.patientName = appointment?.title || null;
        }

        if (invoice.patientId) {
          const patient = await Patient.findById(invoice.patientId);
          invoice.patientName = patient?.patientName || null;
        }

        return invoice;
      })
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Invoices');

    worksheet.columns = [
      { header: 'INV. DATE', key: 'createdAt', width: 20 },
      { header: 'BILL NO.', key: 'receiptNo', width: 25 },
      { header: 'PATIENT NAME', key: 'patientName', width: 30 },
      { header: 'TOTAL AMOUNT', key: 'totalAmount', width: 30 },
      { header: 'TOTAL DISCOUNT', key: 'totalDiscount', width: 30 },
      { header: 'PAYABLE AMOUNT', key: 'payableAmount', width: 30 },
      { header: 'CASH AMOUNT', key: 'cashAmount', width: 15 },
      { header: 'ONLINE AMOUNT', key: 'onlineAmount', width: 20 },
    ];

    for (const invoice of enhancedInvoices) {

      worksheet.addRow({
        createdAt: invoice?.createdAt
          ? new Date(invoice.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-')
          : '',
        receiptNo: invoice?.invoicePlan[0].receiptNo,
        patientName: invoice?.patientName || 'N/A',
        totalAmount: invoice?.invoicePlan.reduce((total, section) => total + (section.qty * section.cost), 0),
        totalDiscount: invoice?.invoicePlan[0].totalDiscount != null ? invoice?.invoicePlan[0].totalDiscount : invoice?.invoicePlan.reduce((total, section) => total + section.discountAmount, 0),
        payableAmount: (invoice?.invoicePlan[0].totalDiscount != null ? (invoice?.invoicePlan.reduce((total, section) => total + section.procedureTotal, 0) - invoice?.invoicePlan[0].totalDiscount) : invoice?.invoicePlan.reduce((total, section) => total + section.procedureTotal, 0)),
        cashAmount: invoice?.invoicePlan[0].cashAmount ? invoice?.invoicePlan[0].cashAmount : 0,
        onlineAmount: invoice?.invoicePlan[0].onlineAmount ? invoice?.invoicePlan[0].onlineAmount : 0
      });
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoices${startDate || 'all'}_to_${endDate || 'all'}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('Excel Export Error:', err);
    res.status(500).json({ message: 'Failed to export orders', success: false });
  }
};

export const getPaginatedInvoices = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const search = req.query.search || "";
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
        "invoicePlan.procedureName": { $regex: search, $options: "i" },
      });
    }

    if (search) {
      orConditions.push({
        "invoicePlan.receiptNo": { $regex: search, $options: "i" },
      });
    }

    if (orConditions.length) {
      matchStage.$or = orConditions;
    }

    const basePipeline = [{ $match: matchStage }];

    const invoices = await Invoice.aggregate([
      ...basePipeline,
      { $sort: { _id: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    const [totalInvoicesResult] = await Invoice.aggregate([
      ...basePipeline,
      { $count: "total" },
    ]);

    const totalInvoices = totalInvoicesResult?.total || 0;

    // 🔁 Enrich with patient/appointment names
    const enhancedInvoices = await Promise.all(
      invoices.map(async (invoice) => {
        if (invoice.appointmentId) {
          const appointment = await Appointment.findById(invoice.appointmentId);
          invoice.patientName = appointment?.title || null;
        }

        if (invoice.patientId) {
          const patient = await Patient.findById(invoice.patientId);
          invoice.patientName = patient?.patientName || null;
        }

        return invoice;
      })
    );

    res.status(200).json({
      invoices: enhancedInvoices,
      success: true,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalInvoices / limit),
        totalInvoices,
      },
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({ message: "Failed to fetch invoices", success: false });
  }
};


// Get invoice by ID
export const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found', success: false });
    }
    res.status(200).json({ invoice, success: true });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ message: 'Failed to fetch invoice', success: false });
  }
};

// Update invoice by ID
export const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { invoicePlan, appointmentId, userId, centerId } = req.body;

    // Build updated data
    const updatedData = {
      ...(invoicePlan && { invoicePlan }),
      appointmentId,
      ...(userId && { userId }),
      centerId
    };

    const invoice = await Invoice.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found', success: false });
    }
    res.status(200).json({ invoice, success: true });
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(400).json({ message: 'Failed to update invoice', success: false });
  }
};

// Delete invoice by ID
export const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findByIdAndDelete(id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found', success: false });
    }
    res.status(200).json({ invoice, success: true });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ message: 'Failed to delete invoice', success: false });
  }
};

// Get the last invoice for a center
export const getLastInvoice = async (req, res) => {
  try {
    const { id } = req.params; // centerId

    // Find the most recent invoice for the center
    const invoice = await Invoice.findOne({ centerId: id })
      .sort({ createdAt: -1 }) // Sort by creation date in descending order
      .limit(1); // Get only the most recent one

    if (!invoice) {
      return res.status(404).json({
        message: 'No invoices found for this center',
        success: false
      });
    }

    res.status(200).json({
      invoice,
      success: true
    });
  } catch (error) {
    console.error('Error fetching last invoice:', error);
    res.status(500).json({
      message: 'Failed to fetch last invoice',
      success: false
    });
  }
};

export const dashboardInvoices = async (req, res) => {
  try {
    const { id } = req.params;
    const totalInvoices = await Invoice.countDocuments({ centerId: id }); // Get total count

    const now = new Date();
    const istOffset = 5.5 * 60 * 60000; // 5.5 hours in ms
    const todayStartIST = new Date(new Date(now.setHours(0, 0, 0, 0)) - istOffset);
    const todayEndIST = new Date(new Date(now.setHours(23, 59, 59, 999)) - istOffset);

    const todaysInvoices = await Invoice.find({
      centerId: id,
      createdAt: { $gte: todayStartIST, $lte: todayEndIST }
    }, { _id: 1, appointmentId: 1, invoicePlan: 1 })
      .sort({ createdAt: -1 })

    let cashAmountTotal = 0;
    let onlineAmountTotal = 0;

    const countOfInvoices = await Promise.all(
      todaysInvoices.map(async (invoice) => {
        const cashAmount = invoice.invoicePlan?.[0]?.cashAmount || 0;
        const onlineAmount = invoice.invoicePlan?.[0]?.onlineAmount || 0;

        // Accumulate totals
        cashAmountTotal += cashAmount;
        onlineAmountTotal += onlineAmount;
      })
    );


    const lastFiveInvoices = await Invoice.find({ centerId: id }, { _id: 1, appointmentId: 1, invoicePlan: 1 })
      .sort({ createdAt: -1 }) // Sort by creation date (descending)
      .limit(5); // Get last 5 Invoices

    const enhancedInvoices = await Promise.all(
      lastFiveInvoices.map(async (invoice) => {
        if (invoice.appointmentId) {
          const appointment = await Appointment.findOne({ _id: invoice.appointmentId });
          return { ...invoice.toObject(), appointment }; // Convert Mongoose document to plain object
        }
        return invoice.toObject(); // If no invoiceId, return appointment as-is
      })
    );

    return res.status(200).json({
      totalInvoices,
      invoices: enhancedInvoices,
      cashAmountTotal,
      onlineAmountTotal
    });
  } catch (error) {
    console.error('Error fetching Invoices:', error);
    res.status(500).json({ message: 'Failed to fetch Invoices', success: false });
  }
};

export const searchInvoices = async (req, res) => {
  try {
    const { id } = req.params;
    const { search, page = 1 } = req.query;
    const limit = 12;
    const skip = (page - 1) * limit;

    if (!search) {
      return res.status(400).json({ message: 'Search query is required', success: false });
    }

    const regex = new RegExp(search, 'i');

    const matchedAppointments = await Appointment.find({
      title: { $regex: regex }
    }).select('_id');

    const appointmentIds = matchedAppointments.map(a => a._id);

    const query = {
      centerId: id,
      $or: [
        { appointmentId: { $in: appointmentIds } }
      ]
    };

    const invoices = await Invoice.find(query);


    if (!invoices) {
      return res.status(404).json({ message: 'No invoices found', success: false });
    }

    const enhancedInvoices = await Promise.all(
      invoices.map(async (invoice) => {
        if (invoice.appointmentId) {
          const appointment = await Appointment.findOne({ _id: invoice.appointmentId });
          return { ...invoice.toObject(), appointment }; // Convert Mongoose document to plain object
        }
        return invoice.toObject(); // If no invoiceId, return appointment as-is
      })
    );

    return res.status(200).json({
      invoices: enhancedInvoices,
      success: true,
      pagination: {
        currentPage: 1,
        totalPages: Math.ceil(invoices.length / limit),
        totalInvoices: invoices.length
      }
    });
  } catch (error) {
    console.error('Error searching invoices:', error);
    res.status(500).json({ message: 'Failed to search invoices', success: false });
  }
};

export const getInvoiceUrl = async (req, res) => {
  try {
    const invoiceId = req.params.id;

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return res.status(404).send('Invoice not found');

    const appointment = await Appointment.findById(invoice.appointmentId);
    if (!appointment) return res.status(404).send('Appointment not found');

    const patient = await Patient.findById(appointment.patientId);
    if (!patient) return res.status(404).send('Patient not found');

    const center = await Center.findById(invoice.centerId);

    const user = await User.findById(invoice.userId);

    const invoiceRows = invoice.invoicePlan.map((section, index) => `
  <tr>
    <td class="px-2 py-1 border-b border-r-2">${index + 1}</td>
    <td class="px-2 py-1 border-b border-r-2"><strong>${section.procedureName}</strong></td>
    <td class="px-2 py-1 border-b border-r-2">${section.qty}</td>
    <td class="px-2 py-1 border-b border-r-2">X</td>
    <td class="px-2 py-1 border-b border-r-2">${section.cost}</td>
    <td class="px-2 py-1 border-b">${section.procedureTotal.toFixed(2)}</td>
  </tr>
`).join('');

 const totalDiscount = invoice.invoicePlan[0].totalDiscount != null 
      ? invoice.invoicePlan[0].totalDiscount
      : invoice.invoicePlan.reduce((t, i) => t + i.discountAmount, 0);
    

    // Conditional rows
    const discountRow = totalDiscount > 0 ? `
      <tr>
        <td colSpan="4" class="py-1">&nbsp;</td>
        <td style="width:140px !important;" class="text-left font-bold py-1">
          Total Discount: 
        </td>
        <td>
          <div class="text-right pr-10 justify-end flex items-center gap-2 py-1 px-1">
            ${totalDiscount.toFixed(2)}
            <label class="text-sm font-semibold">INR</label>
          </div>
        </td>
      </tr>
    ` : '';

const cashAmountRow = invoice.invoicePlan[0].cashAmount > 0 ? `
      <tr>
        <td colSpan="4" class="py-1">&nbsp;</td>
        <td style="width:140px !important;" class="text-left font-bold py-1">
          Cash Amount: 
        </td>
        <td>
          <div class="text-right pr-10 justify-end flex items-center gap-2 py-1 px-1">
            ${invoice.invoicePlan[0].cashAmount.toFixed(2)}
            <label class="text-sm font-semibold">INR</label>
          </div>
        </td>
      </tr>
    ` : '';

    const onlineAmountRow = invoice.invoicePlan[0].onlineAmount > 0 ? `
      <tr>
        <td colSpan="4" class="py-1">&nbsp;</td>
        <td style="width:140px !important;" class="text-left font-bold py-1">
          Online Amount: 
        </td>
        <td>
          <div class="text-right pr-10 justify-end flex items-center gap-2 py-1 px-1">
            ${invoice.invoicePlan[0].onlineAmount.toFixed(2)}
            <label class="text-sm font-semibold">INR</label>
          </div>
        </td>
      </tr>
    ` : '';

    // const grandTotal = invoice.invoicePlan.reduce((t, i) => t + (i.qty * i.cost), 0).toFixed(2);
    // const totalDiscount = invoice.invoicePlan.reduce((t, i) => t + i.discountAmount, 0).toFixed(2);
    // const finalTotal = invoice.invoicePlan.reduce((t, i) => t + i.procedureTotal, 0).toFixed(2);

    const invoiceHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>IR Clinic Invoice</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <style>
    @page { margin: 0; size: A4; }
    body { padding: 30px; font-family: sans-serif; }
  </style>
</head>
<body>
  <header class="flex justify-between items-center border-b pb-4 mb-6">
    <img src="https://cdn.builder.io/api/v1/image/assets/TEMP/57b030fed4d07d3a5a5d9e2e444d3f8ecd2d777e" alt="IR Clinic Logo"
            class="object-contain  max-w-full"
            style="width: 300px !important; height:120px !important" />
    <div class="text-right min-w-[200px] max-w-sm">
      <h1 class="text-xl font-bold">IR CLINIC</h1>
      <address class="text-sm not-italic" style="width: 300px !important; ">
        ${center.centerAddress}<br />
        PH: +91 ${center.adminPhoneNo}
      </address>
    </div>
  </header>

  <div class="content text-sm"  style="margin-top: 30px !important;">
                            <div style="display: flex; flex-wrap: wrap; gap: 20px;">
                               <div style="flex: 1; min-width: 400px;">
                                    <p><strong>Patient Name:</strong> ${patient.patientName || ""}</p>
                                    </div>
                                    <div style="flex: 1; min-width: 250px;">
                                        <p><strong> Bill No:</strong> ${invoice.invoicePlan[0].receiptNo || ""} </p>
                                    </div>
                            </div>
            
                            <div style="display: flex; flex-wrap: wrap; gap: 20px;">
                                <div style="flex: 1; min-width: 400px;">
                                    <p><strong>Patient ID:</strong> ${patient.caseId || ""}</p>
                                </div>
                                <div style="flex: 1; min-width: 250px;">
                                    <p><strong>Age/Gender:</strong> ${patient.age || ""}/${(patient.gender || "").toUpperCase()}</p>
                                </div>
                            </div>
            
                            <div style="display: flex; flex-wrap: wrap; gap: 20px;">
                                 ${patient.reference && patient.reference.label ? `
                                <div style="flex: 1; min-width: 400px;">
                                    <p><strong>Reference By:</strong> ${patient.reference.label}</p>
                                </div>
                                ` :   `<div style="flex: 1; min-width: 400px;">
                                    <p><strong>Mobile No:</strong> ${patient.phoneNo || ""}</p>
                                </div>`  }
                                <div style="flex: 1; min-width: 250px;">
                                        <p><strong>Date:</strong> ${moment(invoice.updatedAt).format('DD/MM/YYYY')}</p>
                                    </div>
                                
                            </div>

                            <div style="display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 30px;">
                                <div style="flex: 1; min-width: 400px;">
                                    <p><strong>Address:</strong> ${patient.address || ""}</p>
                                </div>
                                ${patient.reference && patient.reference.label ? `
                                <div style="flex: 1; min-width: 250px;">
                                    <p><strong>Mobile No:</strong> ${patient.phoneNo || ""}</p>
                                </div>
                                ` : ""}
                                
                                
                                    
                                
                                
                            </div>
            
                          
                        </div>

  <div id="${invoice._id}" style="margin-top: 50px !important;"> <!-- Replace with actual invoiceId if needed -->
  <table class="table-auto w-full text-center text-sm mt-2">
    <thead>
      <tr class="bg-white">
        <th class="px-2 py-1 border-b border-r-2">#</th>
        <th class="px-2 py-1 border-b border-r-2">Procedure</th>
        <th class="px-2 py-1 border-b border-r-2">QTY</th>
        <th class="px-2 py-1 border-b border-r-2">X</th>
        <th class="px-2 py-1 border-b border-r-2">COST</th>
        <th class="px-2 py-1 border-b">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      <!-- Loop this TR for each item in invoice.invoicePlan -->
      ${invoiceRows}
    </tbody>
    <tfoot>
                                                                                                     <tr >
                                                                                                        <td  colSpan="4" class='py-1'>&nbsp;</td>
                                                                                                        <td style="width:140px !important;" class="text-left font-bold py-1">
                                                                                                            Total Amount: 
                                                                                                        </td>
                                                                                                        <td>
                                                                                                            <div class="text-right pr-10 justify-end flex items-center gap-2 py-1 px-1">

                                                                                                                ${invoice?.invoicePlan.reduce((total, section) => total + (section.qty * section.cost), 0).toFixed(2)}
                                                                                                                <label class="text-sm font-semibold">INR </label>
                                                                                                            </div>

                                                                                                        </td>
                                                                                                    </tr>

                                                                                                   ${discountRow}

                                                                                                <tr >
                                                                                                    <td  colSpan="4" class='py-1'>&nbsp;</td>
                                                                                                    <td style="width:140px !important;" class="text-left font-bold py-1">
                                                                                                        Payable Amount: 
                                                                                                    </td>
                                                                                                    <td>
                                                                                                        <div class="text-right pr-10 justify-end flex items-center gap-2 py-1 px-1">

                                                                                                           ${(invoice?.invoicePlan[0].totalDiscount != null ? (invoice?.invoicePlan.reduce((total, section) => total + section.procedureTotal, 0) - invoice?.invoicePlan[0].totalDiscount):invoice?.invoicePlan.reduce((total, section) => total + section.procedureTotal, 0)).toFixed(2)}
                                                                                                            <label class="text-sm font-semibold">INR </label>
                                                                                                        </div>

                                                                                                    </td>
                                                                                                </tr>

                                                                                                 ${cashAmountRow}
                                                                                                 ${onlineAmountRow}
      
    </tfoot>
  </table>
  
</div>
 <div style="margin-top: 30px !important;" class="flex flex-wrap gap-4 items-center text-center px-2 py-1.5 w-full bg-[#AAE1E6] border-[#2DAFBE] max-md:max-w-full">
                            <section class="flex flex-col justify-center items-end py-1 px-10 mt-4 w-full text-xs font-bold text-center max-md:max-w-full">
                            <div>For IR CLINIC</div>
                            <div class="flex mt-2 bg-zinc-50 min-h-[80px] w-[90px]" />
                            <div class="mt-6">Signature</div>
                        </section><section class=" w-full text-xs max-md:max-w-full">
                       
                        <p class="gap-4 self-stretch text-left px-2 mt-4 w-full max-md:max-w-full">
                            Received with thanks
                        </p>
                        ${user && user.username ? `<p class="gap-4 self-stretch text-left px-2 mt-2 w-full max-md:max-w-full">
                           <span class="font-semibold">User : </span>${user.username}
                        </p>` : ""}
                         <p class="gap-4 self-stretch text-left px-2 mt-1 w-full max-md:max-w-full">
                           <span class="font-semibold">Note </span>
                         </p>
                         <p class="gap-4 self-stretch text-left px-2  w-full max-md:max-w-full">
                            Subject To ${center.centerName.split(" ")[0]} Jurisdiction
                        </p>
                        <p class="gap-4 self-stretch text-left px-2 pr-4  w-full max-md:max-w-full">
                           This Service is Exempt from GST by virtue of Serial No. 82(1) of Service Tax Exemptions to be continued in GST as decided by GST Council ofIndia
                        </p>
                        </section>
                        </div>
</body>
</html>
`;

    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setContent(invoiceHTML, { waitUntil: 'networkidle' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=invoice_${invoice._id}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Playwright PDF generation error:', err);
    res.status(500).send('Failed to generate invoice PDF');
  }
};
