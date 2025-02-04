import { Report } from '../models/report.model.js'; // Update the path as per your project structure

// Add a new report
export const addReport = async (req, res) => {
    try {
        const { reportTitle, documentname, description, impression, advice, userId } = req.body;

        // Validate required fields
        if (!reportTitle || !documentname || !description || !impression || !advice) {
            return res.status(400).json({ message: 'All fields are required', success: false });
        }

        // Create a new report
        const report = new Report({
            reportTitle,
            documentname,
            description,
            impression,
            advice,
            userId
        });

        await report.save();
        res.status(201).json({ report, success: true });
    } catch (error) {
        console.error('Error adding report:', error);
        res.status(500).json({ message: 'Failed to add report', success: false });
    }
};

// Get all reports
export const getReports = async (req, res) => {
    try {
        const reports = await Report.find();
        if (!reports) {
            return res.status(404).json({ message: "No reports found", success: false });
        }
        const reversedreports = reports.reverse();
        const page = parseInt(req.query.page) || 1;

        // Define the number of items per page
        const limit = 12;

        // Calculate the start and end indices for pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        // Paginate the reversed movies array
        const paginatedreports = reversedreports.slice(startIndex, endIndex);
        return res.status(200).json({ 
            reports:paginatedreports, 
            success: true ,
            pagination: {
            currentPage: page,
            totalPages: Math.ceil(reports.length / limit),
            totalreports: reports.length,
        },});
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ message: 'Failed to fetch reports', success: false });
    }
};

// Get report by ID
export const getReportById = async (req, res) => {
    try {
        const { id } = req.params;
        const report = await Report.findById(id);
        if (!report) {
            return res.status(404).json({ message: "Report not found", success: false });
        }
        return res.status(200).json({ report, success: true });
    } catch (error) {
        console.error('Error fetching report:', error);
        res.status(500).json({ message: 'Failed to fetch report', success: false });
    }
};

// Update report by ID
export const updateReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { reportTitle, documentname, description, impression, advice, userId } = req.body;

        // Build updated data
        const updatedData = {
            ...(reportTitle && { reportTitle }),
            ...(documentname && { documentname }),
            ...(description && { description }),
            ...(impression && { impression }),
            ...(advice && { advice }),
            ...(userId && { userId })
        };

        const report = await Report.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
        if (!report) {
            return res.status(404).json({ message: "Report not found", success: false });
        }
        return res.status(200).json({ report, success: true });
    } catch (error) {
        console.error('Error updating report:', error);
        res.status(400).json({ message: 'Failed to update report', success: false });
    }
};

// Delete report by ID
export const deleteReport = async (req, res) => {
    try {
        const { id } = req.params;
        const report = await Report.findByIdAndDelete(id);
        if (!report) {
            return res.status(404).json({ message: "Report not found", success: false });
        }
        return res.status(200).json({ report, success: true });
    } catch (error) {
        console.error('Error deleting report:', error);
        res.status(500).json({ message: 'Failed to delete report', success: false });
    }
};

export const dashboardReports = async (req, res) => {
    try {
        const totalReports = await Report.countDocuments(); // Get total count

        const lastFiveReports = await Report.find({}, { reportTitle: 1, _id: 1 }) // Select only reportTitle
            .sort({ createdAt: -1 }) // Sort by creation date (descending)
            .limit(5); // Get last 5 Reports

        return res.status(200).json({ 
            totalReports, 
            reports: lastFiveReports 
        });
    } catch (error) {
        console.error('Error fetching Reports:', error);
        res.status(500).json({ message: 'Failed to fetch Reports', success: false });
    }
};

export const searchReports = async (req, res) => {
    try {
        const { search } = req.query;
        if (!search) {
            return res.status(400).json({ message: 'Search query is required', success: false });
        }

        const regex = new RegExp(search, 'i'); // Case-insensitive search

        const reports = await Report.find({
            $or: [
                { reportTitle: regex },
                { documentname: regex },
                { description: regex },
                { impression: regex },
                { advice: regex },
            ]
        });

        if (!reports) {
            return res.status(404).json({ message: 'No reports found', success: false });
        }

        return res.status(200).json({
            reports: reports,
            success: true,
            pagination: {
                currentPage: 1,
                totalPages: Math.ceil(reports.length / 12),
                totalReports: reports.length,
            },
        });
    } catch (error) {
        console.error('Error searching reports:', error);
        res.status(500).json({ message: 'Failed to search reports', success: false });
    }
};