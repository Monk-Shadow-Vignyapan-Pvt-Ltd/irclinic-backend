import { Doctor } from '../models/doctor.model.js'; // Update the path as per your project structure
import ExcelJS from 'exceljs';

// Add a new doctor
export const addDoctor = async (req, res) => {
    try {
        const { firstName, lastName, gender, phoneNo,alterphoneNo, email, company,opdTime,address, state, city, speciality, isPartner,superDoctor,centerId, userId } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !gender || !phoneNo ) {
            return res.status(400).json({ message: 'All fields are required', success: false });
        }

        // Create a new doctor
        const doctor = new Doctor({
            firstName,
            lastName,
            gender,
            phoneNo,
            alterphoneNo,
            email,
            company,
            opdTime,address,
            state,
            city,
            speciality,
            isPartner,
            superDoctor,
            centerId:(centerId === '')  ? null:centerId,
            userId
        });

        await doctor.save();
        res.status(201).json({ doctor, success: true });
    } catch (error) {
        console.error('Error adding doctor:', error);
        res.status(500).json({ message: 'Failed to add doctor', success: false });
    }
};

// Get all doctors
export const getDoctors = async (req, res) => {
    try {
        const { id } = req.params;
        const doctors = await Doctor.find({ centerId: id });
        if (!doctors ) {
            return res.status(404).json({ message: "No doctors found", success: false });
        }
        const reverseddoctors = doctors.reverse();
        const page = parseInt(req.query.page) || 1;

        // Define the number of items per page
        const limit = 12;

        // Calculate the start and end indices for pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        // Paginate the reversed movies array
        const paginateddoctors = reverseddoctors.slice(startIndex, endIndex);
        return res.status(200).json({
            doctors:paginateddoctors,
            success: true ,
            pagination: {
            currentPage: page,
            totalPages: Math.ceil(doctors.length / limit),
            totaldoctors: doctors.length,
        },});
    } catch (error) {
        console.error('Error fetching doctors:', error);
        res.status(500).json({ message: 'Failed to fetch doctors', success: false });
    }
};

export const getAllDoctors = async (req, res) => {
    try {

        const doctors = await Doctor.find({
            $or: [
                { superDoctor: true },
                {isPartner:false}
            ]
        });

        if (!doctors || doctors.length === 0) {
            return res.status(404).json({ message: "No doctors found", success: false });
        }

        return res.status(200).json({
            doctors,
            success: true
        });
    } catch (error) {
        console.error('Error fetching doctors:', error);
        res.status(500).json({ message: 'Failed to fetch doctors', success: false });
    }
};

export const getReferenceDoctors = async (req, res) => {
    try {
        const { id } = req.params;

        const doctors = await Doctor.find({
            centerId: id ,
            $or: [
                {isPartner:true}
            ]
        });

        if (!doctors || doctors.length === 0) {
            return res.status(404).json({ message: "No doctors found", success: false });
        }

        return res.status(200).json({
            doctors,
            success: true
        });
    } catch (error) {
        console.error('Error fetching doctors:', error);
        res.status(500).json({ message: 'Failed to fetch doctors', success: false });
    }
};


// Get doctor by ID
export const getDoctorById = async (req, res) => {
    try {
        const { id } = req.params;
        const doctor = await Doctor.findById(id);
        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found", success: false });
        }
        return res.status(200).json({ doctor, success: true });
    } catch (error) {
        console.error('Error fetching doctor:', error);
        res.status(500).json({ message: 'Failed to fetch doctor', success: false });
    }
};

// Update doctor by ID
export const updateDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, gender, phoneNo,alterphoneNo, email, company,opdTime,address, state, city, speciality, isPartner,superDoctor,centerId, userId } = req.body;

        // Build updated data
        const updatedData = {
            ...(firstName && { firstName }),
            ...(lastName && { lastName }),
            ...(gender && { gender }),
            ...(phoneNo && { phoneNo }),
            ...(alterphoneNo && { alterphoneNo }),
            ...(email && { email }),
            ...(company && { company }),
            ...(opdTime && { opdTime }),
            ...(address && { address }),
            ...(state && { state }),
            ...(city && { city }),
            ...(speciality && { speciality }),
            ...(isPartner !== undefined && { isPartner }),
            superDoctor,
            centerId: (centerId === "") ? null : centerId ,
            ...(userId && { userId })
        };

        const doctor = await Doctor.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found", success: false });
        }
        return res.status(200).json({ doctor, success: true });
    } catch (error) {
        console.error('Error updating doctor:', error);
        res.status(400).json({ message: 'Failed to update doctor', success: false });
    }
};

// Delete doctor by ID
export const deleteDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const doctor = await Doctor.findByIdAndDelete(id);
        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found", success: false });
        }
        return res.status(200).json({ doctor, success: true });
    } catch (error) {
        console.error('Error deleting doctor:', error);
        res.status(500).json({ message: 'Failed to delete doctor', success: false });
    }
};

export const dashboardDoctors = async (req, res) => {
    try {
        const { id } = req.params;
        const totalDoctors = await Doctor.countDocuments({ centerId: id }); // Get total count

        const lastFiveDoctors = await Doctor.find({ centerId: id }, { firstName: 1,lastName:1, _id: 1 }) // Select only doctorName
            .sort({ createdAt: -1 }) // Sort by creation date (descending)
            .limit(5); // Get last 5 doctors

        return res.status(200).json({
            totalDoctors,
            doctors: lastFiveDoctors
        });
    } catch (error) {
        console.error('Error fetching doctors:', error);
        res.status(500).json({ message: 'Failed to fetch doctors', success: false });
    }
};

export const searchDoctors = async (req, res) => {
    try {
        const { id } = req.params;
        const { search } = req.query;
        if (!search) {
            return res.status(400).json({ message: 'Search query is required', success: false });
        }

        const regex = new RegExp(search, 'i'); // Case-insensitive search

        const doctors = await Doctor.find({
            centerId: id ,
            $or: [
                { firstName: regex },
                { lastName: regex },
                { email: regex },
                { phoneNo: regex },
                { company: regex },
                { gender: regex },
                { state: regex },
                {'speciality.label' : regex},
                {'address.label' : regex},
                { city: regex },
            ]
        });

        if (!doctors) {
            return res.status(404).json({ message: 'No Doctors found', success: false });
        }

        return res.status(200).json({
            doctors: doctors,
            success: true,
            pagination: {
                currentPage: 1,
                totalPages: Math.ceil(doctors.length / 12),
                totalDoctors: doctors.length,
            },
        });
    } catch (error) {
        console.error('Error searching Doctors:', error);
        res.status(500).json({ message: 'Failed to search Doctors', success: false });
    }
};

// New controller function to export doctors to Excel with filters
export const getDoctorsExcel = async (req, res) => {
  try {
    const { centerId, speciality, address } = req.query;

    const filter = {};

    if (centerId) {
      filter.centerId = centerId;
    }
    if (speciality) {
      // Assuming speciality is an object with a 'label' field, adjust if the schema is different
      filter['speciality.label'] = speciality;
    }
    if (address) {
      // Assuming address is an object with a 'label' field, adjust if the schema is different
      filter['address.label'] = address;
    }

    const doctors = await Doctor.find(filter); // Apply filters

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Doctors');

    // Define columns for the Excel sheet
    worksheet.columns = [
      { header: 'Doctor Name', key: 'name', width: 30 },
      { header: 'Speciality', key: 'speciality', width: 30 },
      { header: 'Hospital', key: 'hospital', width: 30 },
      { header: 'Contact Number', key: 'contactNumber', width: 20 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
    ];

    // Populate the worksheet with doctor data
    doctors.forEach(doctor => {
      worksheet.addRow({
        name: `${doctor.firstName} ${doctor.lastName}`, // Combine first and last name
        speciality: doctor.speciality?.map(s => s.label).join(", ") || 'N/A', // Assuming speciality is an object with a 'label' field
        hospital: doctor.company || 'N/A',     // Assuming hospital is an object with a 'label' field
        contactNumber: doctor.phoneNo,
        address: doctor.address?.label || 'N/A', // Assuming address is an object with a 'label' field
        email: doctor.email || 'N/A',
      });
    });

    // Set response headers for Excel download
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    // Dynamically set filename based on filters if needed, or keep it simple
    let filename = 'doctors';
    if (centerId) filename += `_center_${centerId}`;
    if (speciality) filename += `_speciality_${speciality}`;
    if (address) filename += `_address_${address}`;
    filename += '.xlsx';

    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${filename}`
    );

    // Write the Excel file to the response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exporting doctors to Excel:', error);
    res.status(500).json({ message: 'Failed to export doctors', success: false });
  }
};
