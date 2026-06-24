import { Seo } from '../models/seo.model.js';

// Add a new SEO entry
export const addSeo = async (req, res) => {
    try {
        const { pageName, seoTitle, seoDescription, keywords, schema } = req.body;

        // Validate required fields
        if (!pageName || !seoTitle) {
            return res.status(400).json({ message: 'Page Name and SEO title are required', success: false });
        }

    
        const existingSeo = await Seo.findOne({ pageName });

        if (existingSeo) {
          

            existingSeo.pageName = pageName;
            existingSeo.seoTitle = seoTitle;
            existingSeo.seoDescription = seoDescription;
            existingSeo.keywords = keywords;
            existingSeo.schema = schema;

            const updatedSeo = await Seo.findByIdAndUpdate(existingSeo._id, existingSeo, { new: true, runValidators: true });

            return res.status(200).json({
                message: 'Seo updated successfully',
                seo: updatedSeo,
                success: true
            });
        }

        const seoEntry = new Seo({
            pageName,
            seoTitle,
            seoDescription,
            schema,
            keywords,
        });

        await seoEntry.save();
        res.status(201).json({ seoEntry, success: true });
    } catch (error) {
        console.error('Error adding SEO entry:', error);
        res.status(500).json({ message: 'Failed to add SEO entry', success: false });
    }
};


// Get SEO entry by ID
export const getSeoById = async (req, res) => {
    try {
        const { id } = req.params;
        const seoEntry = await Seo.findById(id);
        if (!seoEntry) {
            return res.status(404).json({ message: "SEO entry not found", success: false });
        }
        res.status(200).json({ seoEntry, success: true });
    } catch (error) {
        console.error('Error fetching SEO entry:', error);
        res.status(500).json({ message: 'Failed to fetch SEO entry', success: false });
    }
};

// Get SEO entry by Page Name
export const getSeoByPageName = async (req, res) => {
    try {
        const { pageName } = req.params;

        if (!pageName) {
            return res.status(400).json({ message: 'Page Name is required', success: false });
        }

        const seoEntry = await Seo.findOne({ pageName });

        if (!seoEntry) {
            return res.status(200).json({ message: 'SEO entry not found', success: true });
        }

        res.status(200).json({ seoEntry, success: true });
    } catch (error) {
        console.error('Error fetching SEO entry by Page Name:', error);
        res.status(500).json({ message: 'Failed to fetch SEO entry', success: false });
    }
};


// Update SEO entry by ID
export const updateSeo = async (req, res) => {
    try {
        const { id } = req.params;
        const { pageName,seoTitle, seoDescription, keywords,schema } = req.body;

        // Validate required fields
        if (!pageName || !seoTitle ) {
            return res.status(400).json({ message: 'Page Name and SEO title are required', success: false });
        }

        const updatedData = {
            ...(seoTitle && { seoTitle }),
            ...(pageName && { pageName }),
            ...(seoDescription && { seoDescription }),
            ...(keywords && { keywords }),
            schema
        };

        const seoEntry = await Seo.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
        if (!seoEntry) {
            return res.status(404).json({ message: "SEO entry not found", success: false });
        }

        res.status(200).json({ seoEntry, success: true });
    } catch (error) {
        console.error('Error updating SEO entry:', error);
        res.status(500).json({ message: 'Failed to update SEO entry', success: false });
    }
};

// Delete SEO entry by ID
export const deleteSeo = async (req, res) => {
    try {
        const { id } = req.params;
        const seoEntry = await Seo.findByIdAndDelete(id);
        if (!seoEntry) {
            return res.status(404).json({ message: "SEO entry not found", success: false });
        }
        res.status(200).json({ message: "SEO entry deleted successfully", success: true });
    } catch (error) {
        console.error('Error deleting SEO entry:', error);
        res.status(500).json({ message: 'Failed to delete SEO entry', success: false });
    }
};
