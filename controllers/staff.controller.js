import { Staff } from "../models/staff.model.js";
import ExcelJS from "exceljs";

// ➕ Add a new staff member
export const addStaff = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      gender,
      phoneNo,
      alterphoneNo,
      email,
      clinicTime,
      address,
      state,
      city,
      occupation,
      inIR,
      centerId,
      userId,
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !gender || !phoneNo) {
      return res
        .status(400)
        .json({ message: "All required fields must be filled", success: false });
    }

    const staff = new Staff({
      firstName,
      lastName,
      gender,
      phoneNo,
      alterphoneNo,
      email,
      clinicTime,
      address,
      state,
      city,
      occupation,
      inIR,
      centerId: centerId === "" ? null : centerId,
      userId,
    });

    await staff.save();
    res.status(201).json({ staff, success: true });
  } catch (error) {
    console.error("Error adding staff:", error);
    res.status(500).json({ message: "Failed to add staff", success: false });
  }
};

// 📋 Get all staff (paginated)
export const getStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const staffList = await Staff.find({ centerId: id });

    if (!staffList || staffList.length === 0) {
      return res.status(404).json({ message: "No staff found", success: false });
    }

    const reversed = staffList.reverse();
    const page = parseInt(req.query.page) || 1;
    const limit = 12;

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const paginated = reversed.slice(startIndex, endIndex);

    res.status(200).json({
      staff: paginated,
      success: true,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(staffList.length / limit),
        totalStaff: staffList.length,
      },
    });
  } catch (error) {
    console.error("Error fetching staff:", error);
    res.status(500).json({ message: "Failed to fetch staff", success: false });
  }
};

// 🧾 Get all staff (including inIR = true)
export const getIRStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const staffList = await Staff.find({
      $or: [{ centerId: id }, { inIR: true }],
    });

    if (!staffList || staffList.length === 0) {
      return res.status(404).json({ message: "No staff found", success: false });
    }

    res.status(200).json({ staff: staffList, success: true });
  } catch (error) {
    console.error("Error fetching staff:", error);
    res.status(500).json({ message: "Failed to fetch staff", success: false });
  }
};

export const getOtherStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const staffList = await Staff.find({
      $or: [{ centerId: id }, { inIR: false }],
    });

    if (!staffList || staffList.length === 0) {
      return res.status(404).json({ message: "No staff found", success: false });
    }

    res.status(200).json({ staff: staffList, success: true });
  } catch (error) {
    console.error("Error fetching staff:", error);
    res.status(500).json({ message: "Failed to fetch staff", success: false });
  }
};

// 🔍 Get staff by ID
export const getStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({ message: "Staff not found", success: false });
    }
    res.status(200).json({ staff, success: true });
  } catch (error) {
    console.error("Error fetching staff:", error);
    res.status(500).json({ message: "Failed to fetch staff", success: false });
  }
};

// ✏️ Update staff
export const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      gender,
      phoneNo,
      alterphoneNo,
      email,
      clinicTime,
      address,
      state,
      city,
      occupation,
      inIR,
      centerId,
      userId,
    } = req.body;

    const updatedData = {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(gender && { gender }),
      ...(phoneNo && { phoneNo }),
      ...(alterphoneNo && { alterphoneNo }),
      ...(email && { email }),
      ...(clinicTime && { clinicTime }),
      ...(address && { address }),
      ...(state && { state }),
      ...(city && { city }),
      ...(occupation && { occupation }),
      ...(inIR !== undefined && { inIR }),
      centerId: centerId === "" ? null : centerId,
      ...(userId && { userId }),
    };

    const staff = await Staff.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });

    if (!staff) {
      return res.status(404).json({ message: "Staff not found", success: false });
    }

    res.status(200).json({ staff, success: true });
  } catch (error) {
    console.error("Error updating staff:", error);
    res.status(400).json({ message: "Failed to update staff", success: false });
  }
};

// ❌ Delete staff
export const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await Staff.findByIdAndDelete(id);
    if (!staff) {
      return res.status(404).json({ message: "Staff not found", success: false });
    }
    res.status(200).json({ staff, success: true });
  } catch (error) {
    console.error("Error deleting staff:", error);
    res.status(500).json({ message: "Failed to delete staff", success: false });
  }
};


// 🔎 Search staff
export const searchStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { search } = req.query;

    if (!search) {
      return res.status(400).json({ message: "Search query required", success: false });
    }

    const regex = new RegExp(search, "i");

    const staffList = await Staff.find({
      centerId: id,
      $or: [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { phoneNo: regex },
        { gender: regex },
        { state: regex },
        { city: regex },
        { "occupation.label": regex },
        { "address.label": regex },
      ],
    });

    if (!staffList) {
      return res.status(404).json({ message: "No staff found", success: false });
    }

    res.status(200).json({
      staff: staffList,
      success: true,
      pagination: {
        currentPage: 1,
        totalPages: Math.ceil(staffList.length / 12),
        totalStaff: staffList.length,
      },
    });
  } catch (error) {
    console.error("Error searching staff:", error);
    res.status(500).json({ message: "Failed to search staff", success: false });
  }
};

// 📤 Export staff to Excel
export const getStaffExcel = async (req, res) => {
  try {
    const { centerId, occupation, address } = req.query;

    const filter = {};
    if (centerId) filter.centerId = centerId;
    if (occupation) filter["occupation.label"] = occupation;
    if (address) filter["address.label"] = address;

    const staffList = await Staff.find(filter);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Staff");

    worksheet.columns = [
      { header: "Staff Name", key: "name", width: 30 },
      { header: "Occupation", key: "occupation", width: 25 },
      { header: "Contact Number", key: "phone", width: 20 },
      { header: "Address", key: "address", width: 30 },
      { header: "Email", key: "email", width: 25 },
      { header: "In IR", key: "inIR", width: 10 },
    ];

    staffList.forEach((staff) => {
      worksheet.addRow({
        name: `${staff.firstName} ${staff.lastName}`,
        occupation: staff.occupation?.label || "N/A",
        phone: staff.phoneNo,
        address: staff.address?.label || "N/A",
        email: staff.email || "N/A",
        inIR: staff.inIR ? "Yes" : "No",
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    let filename = "staff";
    if (centerId) filename += `_center_${centerId}`;
    if (occupation) filename += `_occupation_${occupation}`;
    if (address) filename += `_address_${address}`;
    filename += ".xlsx";

    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting staff:", error);
    res.status(500).json({ message: "Failed to export staff", success: false });
  }
};
