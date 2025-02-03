import { Vendor } from '../models/vendor.model.js'; // Update the path as per your project structure

// Add a new vendor
export const addVendor = async (req, res) => {
    try {
        const { vendorName, salesPhoneNo,accountPhoneNo, email, company, address, state, city,isInstrumentVendor,isMedicineVendor, userId } = req.body;

        // Validate required fields
        if (!vendorName || !salesPhoneNo || !accountPhoneNo || !email || !address || !state || !city) {
            return res.status(400).json({ message: 'All required fields must be filled', success: false });
        }

        // Create a new vendor
        const vendor = new Vendor({
            vendorName,
            salesPhoneNo,
            accountPhoneNo,
            email,
            company,
            address,
            state,
            city,
            isInstrumentVendor,
            isMedicineVendor,
            userId
        });

        await vendor.save();
        res.status(201).json({ vendor, success: true });
    } catch (error) {
        console.error('Error adding vendor:', error);
        res.status(500).json({ message: 'Failed to add vendor', success: false });
    }
};

// Get all vendors
export const getVendors = async (req, res) => {
    try {
        const vendors = await Vendor.find();
        if (!vendors ) {
            return res.status(404).json({ message: 'No vendors found', success: false });
        }
        const reversedvendors = vendors.reverse();
        const page = parseInt(req.query.page) || 1;

        // Define the number of items per page
        const limit = 12;

        // Calculate the start and end indices for pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        // Paginate the reversed movies array
        const paginatedvendors = reversedvendors.slice(startIndex, endIndex);
        return res.status(200).json({ 
            vendors:paginatedvendors, 
            success: true ,
            pagination: {
            currentPage: page,
            totalPages: Math.ceil(vendors.length / limit),
            totalvendors: vendors.length,
        },});
    } catch (error) {
        console.error('Error fetching vendors:', error);
        res.status(500).json({ message: 'Failed to fetch vendors', success: false });
    }
};

// Get vendor by ID
export const getVendorById = async (req, res) => {
    try {
        const { id } = req.params;
        const vendor = await Vendor.findById(id);
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found', success: false });
        }
        res.status(200).json({ vendor, success: true });
    } catch (error) {
        console.error('Error fetching vendor:', error);
        res.status(500).json({ message: 'Failed to fetch vendor', success: false });
    }
};

// Update vendor by ID
export const updateVendor = async (req, res) => {
    try {
        const { id } = req.params;
        const { vendorName, salesPhoneNo,accountPhoneNo, email, company, address, state, city,isInstrumentVendor,isMedicineVendor, userId } = req.body;

        // Build updated data
        const updatedData = {
            ...(vendorName && { vendorName }),
            ...(salesPhoneNo && { salesPhoneNo }),
            ...(accountPhoneNo && { accountPhoneNo }),
            ...(email && { email }),
            ...(company && { company }),
            ...(address && { address }),
            ...(state && { state }),
            ...(city && { city }),
            isInstrumentVendor ,
            isMedicineVendor ,
            ...(userId && { userId }),
        };

        const vendor = await Vendor.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found', success: false });
        }
        res.status(200).json({ vendor, success: true });
    } catch (error) {
        console.error('Error updating vendor:', error);
        res.status(400).json({ message: 'Failed to update vendor', success: false });
    }
};

// Delete vendor by ID
export const deleteVendor = async (req, res) => {
    try {
        const { id } = req.params;
        const vendor = await Vendor.findByIdAndDelete(id);
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found', success: false });
        }
        res.status(200).json({ vendor, success: true });
    } catch (error) {
        console.error('Error deleting vendor:', error);
        res.status(500).json({ message: 'Failed to delete vendor', success: false });
    }
};

export const dashboardVendors = async (req, res) => {
    try {
        const totalVendors = await Vendor.countDocuments(); // Get total count

        const lastFiveVendors = await Vendor.find({}, { vendorName: 1, _id: 1 }) // Select only vendorName
            .sort({ createdAt: -1 }) // Sort by creation date (descending)
            .limit(5); // Get last 5 Vendors

        return res.status(200).json({ 
            totalVendors, 
            vendors: lastFiveVendors 
        });
    } catch (error) {
        console.error('Error fetching Vendors:', error);
        res.status(500).json({ message: 'Failed to fetch Vendors', success: false });
    }
};
