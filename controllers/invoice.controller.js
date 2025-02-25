import { Invoice } from '../models/invoice.model.js'; // Update the path as per your project structure
import {Appointment} from '../models/appointment.model.js' ;

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
        const invoices = await Invoice.find();
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
        const totalInvoices = await Invoice.countDocuments(); // Get total count

        const lastFiveInvoices = await Invoice.find({}, {  _id: 1 ,appointmentId:1,invoicePlan:1}) 
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
        const { search } = req.query;
        if (!search) {
            return res.status(400).json({ message: 'Search query is required', success: false });
        }

        const regex = new RegExp(search, 'i'); // Case-insensitive search

        const invoices = await Invoice.find(
        //     {
        //     $or: [
        //         { invoiceName: regex },
        //         { invoiceEmail: regex },
        //         { invoiceAddress: regex },
        //         { adminPhoneNo: regex },
        //         { accountPhoneNo: regex },
        //         { city: regex },
        //         { state: regex }
        //     ]
        // }
    );

        if (!invoices) {
            return res.status(404).json({ message: 'No invoices found', success: false });
        }

        return res.status(200).json({
            invoices: invoices,
            success: true,
            pagination: {
                currentPage: 1,
                totalPages: Math.ceil(invoices.length / 12),
                totalInvoices: invoices.length,
            },
        });
    } catch (error) {
        console.error('Error searching invoices:', error);
        res.status(500).json({ message: 'Failed to search invoices', success: false });
    }
};
