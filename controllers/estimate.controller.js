import { Estimate } from '../models/estimate.model.js'; // Update the path as per your project structure
import {Appointment} from '../models/appointment.model.js' ;
import sharp from 'sharp';

// Add a new estimate
export const addEstimate = async (req, res) => {
    try {
        let { estimatePlan, appointmentId, userId, centerId, followups } = req.body;

        if (!estimatePlan) {
            return res.status(400).json({ message: 'Estimate plan is required', success: false });
        }

        // Function to process audio (convert Base64 to Buffer)
        const processAudio = (base64Audio) => {
            
            if (!base64Audio || typeof base64Audio !== "string") return null;
            const base64Data = base64Audio.split(';base64,').pop();
            return Buffer.from(base64Data, 'base64'); // Convert Base64 to Buffer
        };

        // Function to compress images
        const compressImage = async (base64Image) => {
            const base64Data = base64Image.split(';base64,').pop();
            const buffer = Buffer.from(base64Data, 'base64');
            const compressedBuffer = await sharp(buffer)
                .resize(800, 600, { fit: 'inside' }) // Resize to 800x600 max, maintaining aspect ratio
                .jpeg({ quality: 80 }) // Convert to JPEG with 80% quality
                .toBuffer();
            return `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
        };

        // Function to process images
        const compressAllImages = async (images) => {
            if (!Array.isArray(images)) return [];
            return await Promise.all(
                images.map(async (image) => {
                    try {
                        if (typeof image !== "string" || !image.startsWith('data:image')) return null;
                        return await compressImage(image);
                    } catch (err) {
                        console.error("Error compressing image:", err);
                        return null;
                    }
                })
            ).then(compressedImages => compressedImages.filter(img => img !== null)); // Remove null values
        };

        // Process both images & audio inside estimatePlan
        const processEstimatePlan = async (estimatePlan) => {
            if (!Array.isArray(estimatePlan)) return [];

            return await Promise.all(
                estimatePlan.map(async (plan) => {
                    // Process images
                    const compressedImages = Array.isArray(plan.images) ? await compressAllImages(plan.images) : [];

                    // Process audio
                    const processedAudio = plan.audio ? processAudio(plan.audio) : null;

                    return { 
                        ...plan, 
                        images: compressedImages, 
                        audio: processedAudio 
                    };
                })
            );
        };

        // Process estimatePlan
        estimatePlan = await processEstimatePlan(estimatePlan);

        // Save to MongoDB
        const estimate = new Estimate({ estimatePlan, appointmentId, userId, centerId, followups });
        await estimate.save();

        res.status(201).json({ estimate, success: true });
    } catch (error) {
        console.error('Error adding estimate:', error);
        res.status(500).json({ message: 'Failed to add estimate', success: false });
    }
};


// Get all estimates with pagination
export const getEstimates = async (req, res) => {
    try {
        const estimates = await Estimate.find();
        if (!estimates ) {
            return res.status(404).json({ message: 'No estimates found', success: false });
        }
        const enhancedEstimates = await Promise.all(
                            estimates.map(async (estimate) => {
                                if (estimate.appointmentId) {
                                    const appointment = await Appointment.findOne({ _id: estimate.appointmentId });
                                    return { ...estimate.toObject(), appointment }; // Convert Mongoose document to plain object
                                }
                                return estimate.toObject(); 
                            })
                        );
                        const reversedestimates = enhancedEstimates.reverse();
                        const page = parseInt(req.query.page) || 1;
                
                        // Define the number of items per page
                        const limit = 12;
                
                        // Calculate the start and end indices for pagination
                        const startIndex = (page - 1) * limit;
                        const endIndex = page * limit;
                
                        // Paginate the reversed movies array
                        const paginatedestimates = reversedestimates.slice(startIndex, endIndex);
                        return res.status(200).json({ 
                            estimates:paginatedestimates, 
                            success: true ,
                            pagination: {
                            currentPage: page,
                            totalPages: Math.ceil(estimates.length / limit),
                            totalestimates: estimates.length,
                        },});
    } catch (error) {
        console.error('Error fetching estimates:', error);
        res.status(500).json({ message: 'Failed to fetch estimates', success: false });
    }
};

// Get estimate by ID
export const getEstimateById = async (req, res) => {
    try {
        const { id } = req.params;
        const estimate = await Estimate.findById(id);
        if (!estimate) {
            return res.status(404).json({ message: 'Estimate not found', success: false });
        }
        res.status(200).json({ estimate, success: true });
    } catch (error) {
        console.error('Error fetching estimate:', error);
        res.status(500).json({ message: 'Failed to fetch estimate', success: false });
    }
};

// Update estimate by ID
export const updateEstimate = async (req, res) => {
    try {
        const { id } = req.params;
        let { estimatePlan,appointmentId, userId, centerId ,followups} = req.body;

        // Function to process audio (convert Base64 to Buffer)
        const processAudio = (base64Audio) => {
            if (!base64Audio || typeof base64Audio !== "string") return null;
            const base64Data = base64Audio.split(';base64,').pop();
            return Buffer.from(base64Data, 'base64'); // Convert Base64 to Buffer
        };

        // Function to compress images
        const compressImage = async (base64Image) => {
            const base64Data = base64Image.split(';base64,').pop();
            const buffer = Buffer.from(base64Data, 'base64');
            const compressedBuffer = await sharp(buffer)
                .resize(800, 600, { fit: 'inside' }) // Resize to 800x600 max, maintaining aspect ratio
                .jpeg({ quality: 80 }) // Convert to JPEG with 80% quality
                .toBuffer();
            return `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
        };

        // Function to process images
        const compressAllImages = async (images) => {
            if (!Array.isArray(images)) return [];
            return await Promise.all(
                images.map(async (image) => {
                    try {
                        if (typeof image !== "string" || !image.startsWith('data:image')) return null;
                        return await compressImage(image);
                    } catch (err) {
                        console.error("Error compressing image:", err);
                        return null;
                    }
                })
            ).then(compressedImages => compressedImages.filter(img => img !== null)); // Remove null values
        };

        // Process both images & audio inside estimatePlan
        const processEstimatePlan = async (estimatePlan) => {
            if (!Array.isArray(estimatePlan)) return [];

            return await Promise.all(
                estimatePlan.map(async (plan) => {
                    // Process images
                    const compressedImages = Array.isArray(plan.images) ? await compressAllImages(plan.images) : [];

                    // Process audio
                    const processedAudio = plan.audio ? processAudio(plan.audio) : null;

                    return { 
                        ...plan, 
                        images: compressedImages, 
                        audio: processedAudio 
                    };
                })
            );
        };

        // Process estimatePlan
        estimatePlan = await processEstimatePlan(estimatePlan);
        
 
        const updatedData = { estimatePlan ,appointmentId, ...userId && { userId }, ...centerId && { centerId },followups };
        const estimate = await Estimate.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });

        if (!estimate) {
            return res.status(404).json({ message: 'Estimate not found', success: false });
        }
        res.status(200).json({ estimate, success: true });
    } catch (error) {
        console.error('Error updating estimate:', error);
        res.status(400).json({ message: 'Failed to update estimate', success: false });
    }
};

// Delete estimate by ID
export const deleteEstimate = async (req, res) => {
    try {
        const { id } = req.params;
        const estimate = await Estimate.findByIdAndDelete(id);
        if (!estimate) {
            return res.status(404).json({ message: 'Estimate not found', success: false });
        }
        res.status(200).json({ estimate, success: true });
    } catch (error) {
        console.error('Error deleting estimate:', error);
        res.status(500).json({ message: 'Failed to delete estimate', success: false });
    }
};

// Dashboard estimates
export const dashboardEstimates = async (req, res) => {
    try {
        const totalEstimates = await Estimate.countDocuments();
        const lastFiveEstimates = await Estimate.find({}, { _id: 1 ,appointmentId:1,estimatePlan:1})
            .sort({ createdAt: -1 })
            .limit(5);

        const enhancedEstimates = await Promise.all(
            lastFiveEstimates.map(async (estimate) => {
                    if (estimate.appointmentId) {
                        const appointment = await Appointment.findOne({ _id: estimate.appointmentId });
                        return { ...estimate.toObject(), appointment }; // Convert Mongoose document to plain object
                    }
                    return estimate.toObject(); 
                })
            );

        res.status(200).json({ totalEstimates, estimates: enhancedEstimates });
    } catch (error) {
        console.error('Error fetching estimates:', error);
        res.status(500).json({ message: 'Failed to fetch estimates', success: false });
    }
};

// Search estimates
export const searchEstimates = async (req, res) => {
    try {
        const { search } = req.query;
        if (!search) {
            return res.status(400).json({ message: 'Search query is required', success: false });
        }

        const regex = new RegExp(search, 'i');
        const estimates = await Estimate.find(); // Modify search fields if necessary

        res.status(200).json({
            estimates,
            success: true,
            pagination: {
                currentPage: 1,
                totalPages: Math.ceil(estimates.length / 12),
                totalEstimates: estimates.length,
            },
        });
    } catch (error) {
        console.error('Error searching estimates:', error);
        res.status(500).json({ message: 'Failed to search estimates', success: false });
    }
};
