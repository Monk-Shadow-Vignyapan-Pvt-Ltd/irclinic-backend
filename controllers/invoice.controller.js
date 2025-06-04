import { Invoice } from '../models/invoice.model.js'; // Update the path as per your project structure
import {Appointment} from '../models/appointment.model.js' ;
import { Patient } from '../models/patient.model.js';
import { Center } from '../models/center.model.js';
import { chromium } from 'playwright';
import moment from 'moment';

// Add a new invoice
export const addInvoice = async (req, res) => {
    try {
        const { invoicePlan, appointmentId,userId,centerId } = req.body;

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
        if (!invoices ) {
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
            invoices:paginatedinvoices, 
            success: true ,
            pagination: {
            currentPage: page,
            totalPages: Math.ceil(invoices.length / limit),
            totalinvoices: invoices.length,
        },});
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ message: 'Failed to fetch invoices', success: false });
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
        const { invoicePlan,appointmentId, userId,centerId } = req.body;

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

export const dashboardInvoices = async (req, res) => {
    try {
        const { id } = req.params;
        const totalInvoices = await Invoice.countDocuments({ centerId: id }); // Get total count

        const lastFiveInvoices = await Invoice.find({ centerId: id }, {  _id: 1 ,appointmentId:1,invoicePlan:1}) 
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
            invoices: enhancedInvoices
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
      invoices:enhancedInvoices,
      success: true,
      pagination: {
        currentPage: 1,
        totalPages: Math.ceil(invoices.length / limit),
        totalInvoices:invoices.length
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

    const center = await Center.findById(appointment.centerId);

    const invoiceRows = invoice.invoicePlan.map((section, index) => `
  <tr>
    <td class="px-2 py-1 border-b border-r-2">${index + 1}</td>
    <td class="px-2 py-1 border-b border-r-2"><strong>${section.procedureName}</strong></td>
    <td class="px-2 py-1 border-b border-r-2">${section.qty}</td>
    <td class="px-2 py-1 border-b border-r-2">X</td>
    <td class="px-2 py-1 border-b border-r-2">${section.cost}</td>
    <td class="px-2 py-1 border-b border-r-2">${section.discount} ${section.discountType || ''}</td>
    <td class="px-2 py-1 border-b">${section.procedureTotal.toFixed(2)}</td>
  </tr>
`).join('');

const grandTotal = invoice.invoicePlan.reduce((t, i) => t + (i.qty * i.cost), 0).toFixed(2);
const totalDiscount = invoice.invoicePlan.reduce((t, i) => t + i.discountAmount, 0).toFixed(2);
const finalTotal = invoice.invoicePlan.reduce((t, i) => t + i.procedureTotal, 0).toFixed(2);

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
    <img src="https://cdn.builder.io/api/v1/image/assets/TEMP/57b030fed4d07d3a5a5d9e2e444d3f8ecd2d777e" class="w-48" />
    <div class="text-right">
      <h1 class="text-xl font-bold">IR CLINIC</h1>
      <address class="text-sm not-italic" style="width: 300px !important;">
        ${center.centerAddress}<br />
        PH: ${center.adminPhoneNo}
      </address>
    </div>
  </header>

  <div class="content"  style="margin-top: 30px !important;">
                            <div style="gap: 20px;">
                               
                                    <p><strong>Patient Name:</strong> ${patient.patientName || ""}</p>
                                
                               
                            </div>
            
                            <div style="display: flex; flex-wrap: wrap; gap: 20px;">
                                <div style="flex: 1; min-width: 250px;">
                                    <p><strong>Patient ID:</strong> ${patient.caseId || ""}</p>
                                </div>
                                <div style="flex: 1; min-width: 250px;">
                                    <p><strong>Age/Gender:</strong> ${patient.age || ""}/${(patient.gender || "").toUpperCase()}</p>
                                </div>
                            </div>
            
                            <div style="display: flex; flex-wrap: wrap; gap: 20px;">
                                <div style="flex: 1; min-width: 250px;">
                                    <p><strong>Mobile No:</strong> ${patient.phoneNo || ""}</p>
                                </div>
                                ${patient.reference ? `
                                <div style="flex: 1; min-width: 250px;">
                                    <p><strong>Reference By:</strong> ${patient.reference.label}</p>
                                </div>
                                ` : ""}
                            </div>

                            <div style="display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 30px;">
                                <div style="flex: 1; min-width: 250px;">
                                    <p><strong>Address:</strong> ${patient.address || ""}</p>
                                </div>
                                
                                
                                    <div style="flex: 1; min-width: 250px;">
                                        <p><strong>Date:</strong> ${moment(invoice.updatedAt).format('DD/MM/YYYY')}</p>
                                    </div>
                                
                                
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
        <th class="px-2 py-1 border-b border-r-2">DISCOUNT</th>
        <th class="px-2 py-1 border-b">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      <!-- Loop this TR for each item in invoice.invoicePlan -->
      ${invoiceRows}
    </tbody>
    <tfoot>
      <tr>
        <td class="py-2" colspan="2">&nbsp;</td>
        <td colspan="2" class="text-right font-bold py-2">Grand Total (INR)</td>
        <td class="py-2">${grandTotal}</td>
        <td class="py-2">${totalDiscount}</td>
        <td class=" py-2">${finalTotal}</td>
        <td class="py-2">&nbsp;</td>
      </tr>
       <tr>
        <td class="py-1" colspan="4">&nbsp;</td>
        <td colspan="2" class="text-right font-bold py-1">Due Amount (INR):</td>
        <td class=" py-1">0.00</td>
      </tr>
      <tr>
        <td class="py-1" colspan="4">&nbsp;</td>
        <td colspan="2" class="text-right font-bold py-1">Due Received (INR):</td>
        <td class=" py-1">0.00</td>
      </tr>
      <tr>
        <td class="py-1" colspan="4">&nbsp;</td>
        <td colspan="2" class="text-right font-bold py-1">Paid Amount (INR):</td>
        <td class=" py-1">${finalTotal}</td>
      </tr>
      
    </tfoot>
  </table>
  
</div>
 <div style="margin-top: 50px !important;" class="flex flex-wrap gap-4 items-center text-center px-2 py-1.5 w-full bg-[#AAE1E6] border-t border-b border-[#2DAFBE] max-md:max-w-full">
                            <div class="self-stretch my-auto w-[90px]">Mode of Payment :</div>
                            <div class="self-stretch my-auto w-[90px]">Online / Cash</div>
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
