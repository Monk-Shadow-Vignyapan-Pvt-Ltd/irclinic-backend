import { Contact } from "../models/contact.model.js"; // Adjust path based on your file structure
import ExcelJS from 'exceljs';

// Add a new contact
export const addContact = async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      subject,
      message,
      isContactClose,
      userId,
      followups,
    } = req.body;

    // Validate required fields
    if (!name || !phone ) {
      return res.status(400).json({
        message: "Please provide all required fields",
        success: false,
      });
    }

    // Check if a contact with the same email or phone already exists
    // const existingContact = await Contact.findOne({
    //   $or: [{ email }, { phone }],
    // });

    // if (existingContact) {
    //   // Update the existing contact
    //   existingContact.name = name;
    //   existingContact.phone = phone;
    //   existingContact.email = email;
    //   existingContact.subject = subject;
    //   existingContact.message = message;
    //   existingContact.isContactClose = isContactClose;
    //   existingContact.userId = userId;
    //   existingContact.followups = followups;
    //   // Save the updated contact
    //   await existingContact.save();

    //   return res.status(200).json({
    //     message: "Contact updated successfully",
    //     contact: existingContact,
    //     success: true,
    //   });
    // }

    const defaultFollowup = {
      followStatus: "Pending",
      followupMessage: "Pending",
      updatedDate: new Date(),
    };

    const finalFollowups = [defaultFollowup];

    // --------------------------------------------------
    // Create new contact
    // --------------------------------------------------
    const newContact = new Contact({
      name,
      phone,
      email,
      subject,
      message,
      isContactClose,
      userId,
      followups: finalFollowups,   // <-- always populated
    });

    // Save the new contact to the database
    await newContact.save();

    res.status(201).json({
      message: "Contact added successfully",
      contact: newContact,
      success: true,
    });
  } catch (error) {
    console.error("Error adding/updating contact:", error);
    res.status(500).json({
      message: "Failed to process the request",
      success: false,
    });
  }
};



// --------------------------------------------------
// GET CONTACTS (with status filter on latest followup)
// --------------------------------------------------
export const getContacts = async (req, res) => {
  try {
    const {
      page = 1,
      search = "",
      limit = 25,
      status = "",   // NEW: follow-up status filter
    } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // --------------------------------------------------
    // Build search filter
    // --------------------------------------------------
    const searchFilter = {};

    if (search && search.trim()) {
      searchFilter.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { email: { $regex: search.trim(), $options: "i" } },
        { subject: { $regex: search.trim(), $options: "i" } },
        { message: { $regex: search.trim(), $options: "i" } },
        { phone: { $regex: search.trim(), $options: "i" } },
      ];
    }

    // --------------------------------------------------
    // Base pipeline
    // --------------------------------------------------
    const basePipeline = [{ $match: searchFilter }];

    // If status filter is set, match the LAST element
    // of the followups array
    if (status && status.trim()) {
      basePipeline.push(
        {
          $addFields: {
            lastFollowup: { $arrayElemAt: ["$followups", -1] },
          },
        },
        {
          $match: {
            "lastFollowup.followStatus": status,
          },
        }
      );
    }

    // --------------------------------------------------
    // Fetch paginated contacts
    // --------------------------------------------------
    const contacts = await Contact.aggregate([
      ...basePipeline,
      { $sort: { _id: -1 } },
      { $skip: skip },
      { $limit: limitNumber },
    ]);

    // --------------------------------------------------
    // Count total
    // --------------------------------------------------
    const [totalResult] = await Contact.aggregate([
      ...basePipeline,
      { $count: "total" },
    ]);

    const total = totalResult?.total || 0;

    return res.status(200).json({
      contacts,
      success: true,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(total / limitNumber),
        totalContacts: total,
      },
    });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return res.status(500).json({
      message: "Failed to fetch contacts",
      success: false,
    });
  }
};

// --------------------------------------------------
// DOWNLOAD CONTACTS EXCEL (with status + search)
// --------------------------------------------------
export const downloadContactsExcel = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      status = "",   // NEW
      search = "",   // NEW
    } = req.query;

    // Validate required date fields
    if (!startDate || !endDate) {
      return res.status(400).json({
        message:
          "Please provide startDate and endDate in query params (YYYY-MM-DD)",
        success: false,
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // --------------------------------------------------
    // Base filter
    // --------------------------------------------------
    const matchStage = {
      createdAt: { $gte: start, $lte: end },
    };

    // Search filter
    if (search && search.trim()) {
      matchStage.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { email: { $regex: search.trim(), $options: "i" } },
        { subject: { $regex: search.trim(), $options: "i" } },
        { message: { $regex: search.trim(), $options: "i" } },
        { phone: { $regex: search.trim(), $options: "i" } },
      ];
    }

    // --------------------------------------------------
    // Pipeline
    // --------------------------------------------------
    const pipeline = [{ $match: matchStage }];

    if (status && status.trim()) {
      pipeline.push(
        {
          $addFields: {
            lastFollowup: { $arrayElemAt: ["$followups", -1] },
          },
        },
        {
          $match: {
            "lastFollowup.followStatus": status,
          },
        }
      );
    }

    pipeline.push({ $sort: { createdAt: -1 } });

    const contacts = await Contact.aggregate(pipeline);

    if (contacts.length === 0) {
      return res.status(404).json({
        message: "No contacts found for the selected filters",
        success: false,
      });
    }

    // --------------------------------------------------
    // Build Excel
    // --------------------------------------------------
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Contacts");

    worksheet.columns = [
      { header: "Name", key: "name", width: 20 },
      { header: "Phone", key: "phone", width: 15 },
      { header: "Email", key: "email", width: 25 },
      { header: "Subject", key: "subject", width: 25 },
      { header: "Message", key: "message", width: 40 },
      { header: "Status", key: "status", width: 25 }, // NEW
      { header: "Is Contact Closed", key: "isContactClose", width: 18 },
      { header: "User ID", key: "userId", width: 24 },
      { header: "Created At", key: "createdAt", width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };

    contacts.forEach((contact) => {
      worksheet.addRow({
        name: contact.name || "",
        phone: contact.phone || "",
        email: contact.email || "",
        subject: contact.subject || "",
        message: contact.message || "",
        status:
          contact.followups?.length > 0
            ? contact.followups[contact.followups.length - 1].followStatus
            : "N/A",
        isContactClose: contact.isContactClose ? "Yes" : "No",
        userId: contact.userId || "",
        createdAt: contact.createdAt
          ? new Date(contact.createdAt).toISOString().split("T")[0]
          : "",
      });
    });

    // --------------------------------------------------
    // Response headers
    // --------------------------------------------------
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=contacts_${startDate.split("T")[0]}_to_${endDate.split("T")[0]}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating Excel:", error);
    res.status(500).json({
      message: "Failed to generate Excel",
      success: false,
    });
  }
};

export const updateContact = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      phone,
      email,
      subject,
      message,
      isContactClose,
      userId,
      followups,
    } = req.body;

    const updatedData = {
      name,
      phone,
      email,
      subject,
      message,
      isContactClose,
      userId,
      followups,
    };

    const contact = await Contact.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });
    if (!contact)
      return res
        .status(404)
        .json({ message: "Contact not found!", success: false });
    return res.status(200).json({ contact, success: true });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message, success: false });
  }
};
