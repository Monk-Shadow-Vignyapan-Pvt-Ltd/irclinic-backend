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
        return res.status(200).json({ reports, success: true });
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
