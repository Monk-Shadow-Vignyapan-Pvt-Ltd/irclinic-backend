import { SubService } from '../models/sub_service.model.js';
import cloudinary from "../utils/cloudinary.js";
import getDataUri from "../utils/datauri.js";
import sharp from 'sharp';

// Add a new subservice
export const addSubService = async (req, res) => {
    try {
        let { subServiceName, subServiceDescription, subServiceImage, howWorks,howWorksName,beforeAfterGallary = [], others, serviceId, subServiceEnabled,subServiceUrl,seoTitle,seoDescription,userId } = req.body;

        // Validate base64 image data
        if (!subServiceImage || !subServiceImage.startsWith('data:image')) {
            return res.status(400).json({ message: 'Invalid image data', success: false });
        }

        const compressImage = async (base64Image) => {
            const base64Data = base64Image.split(';base64,').pop();
            const buffer = Buffer.from(base64Data, 'base64');
            const compressedBuffer = await sharp(buffer)
                .resize(800, 600, { fit: 'inside' }) // Resize to 800x600 max, maintaining aspect ratio
                .jpeg({ quality: 80 }) // Convert to JPEG with 80% quality
                .toBuffer();
            return `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
        };

        // Convert back to Base64 for storage (optional)
        const compressedSubServiceBase64 = await compressImage(subServiceImage);

        const compressGalleryImages = async (gallery) => {
            if (!Array.isArray(gallery)) {
                throw new Error('Input must be an array');
            }
        
            const compressedGallery = await Promise.all(
                gallery.map(async (item) => {
                    if (!item.before.startsWith('data:image') || !item.after.startsWith('data:image')) {
                        throw new Error(`Invalid image in gallery item with id: ${item.id}`);
                    }
        
                    return {
                        ...item,
                        before: await compressImage(item.before),
                        after: await compressImage(item.after),
                    };
                })
            );
        
            return compressedGallery;
        };
        beforeAfterGallary = await compressGalleryImages(beforeAfterGallary);

        // Compress all images in the gallery
        const compressAllImages = async (others) => {
            if (!Array.isArray(others)) return []; // Return empty array if others is not valid

            return await Promise.all(
                others.map(async (item) => {
                    try {
                        if (!Array.isArray(item.images)) {
                            return item;
                        }

                        const compressedImages = await Promise.all(
                            item.images.map(async (image) => {
                                if (!image.file || !image.file.startsWith('data:image')) {
                                    return null;
                                }
                                const compressedFile = await compressImage(image.file);
                                return { ...image, file: compressedFile };
                            })
                        );

                        return { ...item, images: compressedImages.filter(image => image !== null) };
                    } catch (err) {
                        console.error("Error processing item:", item, err);
                        return item; // Fallback to original item if error occurs
                    }
                })
            );
        };

        // Process and compress images
        others = await compressAllImages(others);

        const subService = new SubService({
            subServiceName,
            subServiceDescription,
            subServiceImage:compressedSubServiceBase64, // Store the base64 image data
            howWorks,
            howWorksName,
            beforeAfterGallary,
            others,
            serviceId,
            subServiceEnabled,
            subServiceUrl,seoTitle,seoDescription,
            userId
        });

        await subService.save();
        res.status(201).json({ subService, success: true });
    } catch (error) {
        console.error('Error uploading subservice:', error);
        res.status(500).json({ message: 'Failed to upload subservice', success: false });
    }
};

// Get all subservices
// export const getSubServices = async (req, res) => {
//     try {
//         const subServices = await SubService.find().select('subServiceName subServiceImage subServiceUrl serviceId subServiceEnabled').populate('serviceId'); // Populating parent service data
//         if (!subServices) return res.status(404).json({ message: "Subservices not found", success: false });
//         return res.status(200).json({ subServices });
//     } catch (error) {
//         console.log(error);
//         res.status(500).json({ message: 'Failed to fetch subservices', success: false });
//     }
// };

export const getSubServices = async (req, res) => {
    try {
        const subServices = await SubService.find().select('subServiceName subServiceImage subServiceUrl serviceId subServiceEnabled').populate('serviceId');
        if (!subServices) {
            return res.status(404).json({ message: 'Subservices not found', success: false });
        }
        const reversedsubServices = subServices.reverse();
        const page = parseInt(req.query.page) || 1;

        // Define the number of items per page
        const limit = 12;

        // Calculate the start and end indices for pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        // Paginate the reversed movies array
        const paginatedsubServices = reversedsubServices.slice(startIndex, endIndex);
        res.status(200).json({ subServices:paginatedsubServices, 
            success: true ,
            pagination: {
            currentPage: page,
            totalPages: Math.ceil(subServices.length / limit),
            totalSubServices: subServices.length,} });
    } catch (error) {
        console.error('Error fetching subservices:', error);
        res.status(500).json({ message: 'Failed to fetch subservices', success: false });
    }
};

export const searchSubServices = async (req, res) => {
    try {
        const { search } = req.query;
        if (!search) {
            return res.status(400).json({ message: 'Search query is required', success: false });
        }

        const regex = new RegExp(search, 'i'); // Case-insensitive search

        const subServices = await SubService.find({
            $or: [
                { subServiceName: regex },
            ]
        });

        if (!subServices) {
            return res.status(404).json({ message: 'Subservices not found', success: false });
        }
        const page = parseInt(req.query.page) || 1;

        // Define the number of items per page
        const limit = 12;

        // Calculate the start and end indices for pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        // Paginate the reversed movies array
        const paginatedsubServices = subServices.slice(startIndex, endIndex);
        res.status(200).json({ subServices:paginatedsubServices, 
            success: true ,
            pagination: {
            currentPage: page,
            totalPages: Math.ceil(subServices.length / limit),
            totalSubServices: subServices.length,} });
    } catch (error) {
        console.error('Error searching subservices:', error);
        res.status(500).json({ message: 'Failed to search subservices', success: false });
    }
};

// Get subservice by ID
export const getSubServiceById = async (req, res) => {
    try {
        const subServiceId = req.params.id;
        const subService = await SubService.findById(subServiceId).populate('serviceId'); // Populating parent service data
        if (!subService) return res.status(404).json({ message: "Subservice not found!", success: false });
        return res.status(200).json({ subService, success: true });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Failed to fetch subservice', success: false });
    }
};

export const getSubServiceByUrl = async (req, res) => {
    try {
        const subServiceUrl = req.params.id;
        const subService = await SubService.findOne({subServiceUrl}).populate('serviceId'); // Populating category data
        if (!subService) return res.status(404).json({ message: "SubService not found!", success: false });
        return res.status(200).json({ subService, success: true });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Failed to fetch subservice', success: false });
    }
};

export const getSubServicesByServiceId = async (req, res) => {
    try {
        const { id } = req.params; // Extract the service ID from the request parameters
        const subServices = await SubService.find({ serviceId: id })
        .select('subServiceName subServiceUrl subServiceDescription subServiceImage subServiceEnabled'); // Correctly query by serviceId
        if (!subServices) {
            return res.status(404).json({ message: "Subservices not found!", success: false });
        }
        return res.status(200).json({ subServices, success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch subservices", success: false });
    }
};

// Update subservice by ID
export const updateSubService = async (req, res) => {
    try {
        const { id } = req.params;
        let { subServiceName, subServiceDescription, subServiceImage, howWorks,howWorksName,beforeAfterGallary = [], others, serviceId, subServiceEnabled,subServiceUrl,seoTitle,seoDescription,userId } = req.body;

        const existingSubService = await SubService.findById(id);
                if (!existingSubService) {
                    return res.status(404).json({ message: "Sub Service not found!", success: false });
                }
        
                // Initialize oldUrls array and add the previous serviceUrl if it's different
                let oldUrls = existingSubService.oldUrls || [];
                if (existingSubService.subServiceUrl && existingSubService.subServiceUrl !== subServiceUrl && !oldUrls.includes(existingSubService.subServiceUrl)) {
                    oldUrls.push(existingSubService.subServiceUrl);
                }

        // Validate base64 image data
        if (subServiceImage && !subServiceImage.startsWith('data:image')) {
            return res.status(400).json({ message: 'Invalid image data', success: false });
        }

        const compressImage = async (base64Image) => {
            const base64Data = base64Image.split(';base64,').pop();
            const buffer = Buffer.from(base64Data, 'base64');
            const compressedBuffer = await sharp(buffer)
                .resize(800, 600, { fit: 'inside' }) // Resize to 800x600 max, maintaining aspect ratio
                .jpeg({ quality: 80 }) // Convert to JPEG with 80% quality
                .toBuffer();
            return `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
        };

        // Convert back to Base64 for storage (optional)
        const compressedSubServiceBase64 = await compressImage(subServiceImage);

        const compressGalleryImages = async (gallery) => {
            if (!Array.isArray(gallery)) {
                throw new Error('Input must be an array');
            }
        
            const compressedGallery = await Promise.all(
                gallery.map(async (item) => {
                    if (!item.before.startsWith('data:image') || !item.after.startsWith('data:image')) {
                        throw new Error(`Invalid image in gallery item with id: ${item.id}`);
                    }
        
                    return {
                        ...item,
                        before: await compressImage(item.before),
                        after: await compressImage(item.after),
                    };
                })
            );
        
            return compressedGallery;
        };
        beforeAfterGallary = await compressGalleryImages(beforeAfterGallary);

        // Compress all images in the gallery
        const compressAllImages = async (others) => {
            if (!Array.isArray(others)) return []; // Return empty array if others is not valid

            return await Promise.all(
                others.map(async (item) => {
                    try {
                        if (!Array.isArray(item.images)) {
                            return item;
                        }

                        const compressedImages = await Promise.all(
                            item.images.map(async (image) => {
                                if (!image.file || !image.file.startsWith('data:image')) {
                                    return null;
                                }
                                const compressedFile = await compressImage(image.file);
                                return { ...image, file: compressedFile };
                            })
                        );

                        return { ...item, images: compressedImages.filter(image => image !== null) };
                    } catch (err) {
                        console.error("Error processing item:", item, err);
                        return item; // Fallback to original item if error occurs
                    }
                })
            );
        };

        // Process and compress images
        others = await compressAllImages(others);

        const updatedData = {
            subServiceName,
            subServiceDescription,
            ...(compressedSubServiceBase64 && { subServiceImage:compressedSubServiceBase64 }), // Only update image if new image is provided
            howWorks,
            howWorksName,
            beforeAfterGallary,
            others,
            serviceId,
            subServiceEnabled,
            subServiceUrl,seoTitle,seoDescription,
            userId,
            oldUrls
        };

        const subService = await SubService.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
        if (!subService) return res.status(404).json({ message: "Subservice not found!", success: false });
        return res.status(200).json({ subService, success: true });
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: error.message, success: false });
    }
};

export const onOffSubService = async (req, res) => {
    try {
        const { id } = req.params;
        let { subServiceEnabled } = req.body;

        const existingSubService = await SubService.findById(id)

        
        const updatedData = {
            subServiceName :existingSubService.subServiceName,
            subServiceDescription:existingSubService.subServiceDescription,
            subServiceImage:existingSubService.subServiceImage,
            howWorks:existingSubService.howWorks,
            howWorksName:existingSubService.howWorksName,
            beforeAfterGallary:existingSubService.beforeAfterGallary,
            others:existingSubService.others,
            serviceId:existingSubService.serviceId,
            subServiceEnabled:subServiceEnabled,
            subServiceUrl:existingSubService.subServiceUrl,
            seoTitle:existingSubService.seoTitle,
            seoDescription:existingSubService.seoDescription,
            userId:existingSubService.userId,
            oldUrls:existingSubService.oldUrls
        };

        const subService = await SubService.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
        if (!subService) return res.status(404).json({ message: "Subservice not found!", success: false });
        return res.status(200).json({ subService, success: true });
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: error.message, success: false });
    }
};

// Delete subservice by ID
export const deleteSubService = async (req, res) => {
    try {
        const { id } = req.params;
        const subService = await SubService.findByIdAndDelete(id);
        if (!subService) return res.status(404).json({ message: "Subservice not found!", success: false });
        return res.status(200).json({ subService, success: true });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Failed to delete subservice', success: false });
    }
};

export const getSubServicesFrontend = async (req, res) => {
    try {
        const subServices = await SubService.find()
        .select('subServiceName subServiceUrl serviceId subServiceEnabled')
        .populate('serviceId'); // Populating category data
        if (!subServices) return res.status(404).json({ message: "Sub Services not found", success: false });
        return res.status(200).json({ subServices });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Failed to fetch sub services', success: false });
    }
};

export const getSubServicesBeforeAfter = async (req, res) => {
    try {
        const subServices = await SubService.find()
        .select('subServiceName beforeAfterGallary subServiceEnabled');
        if (!subServices) return res.status(404).json({ message: "Sub Services not found", success: false });
        return res.status(200).json({ subServices });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Failed to fetch sub services', success: false });
    }
};

// Clone subService by ID
function createUrl(name) {
    return name
      .trim()                        // Remove extra spaces
      .toLowerCase()                 // Convert to lowercase
      .replace(/\s+/g, '-')          // Replace spaces with hyphens
      .replace(/[^a-z0-9-]/g, '');   // Remove special characters except hyphens
  }
export const cloneSubService = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the service to clone
        const subServiceToClone = await SubService.findById(id);
        if (!subServiceToClone) {
            return res.status(404).json({ message: "Sub Service to clone not found!", success: false });
        }

        // Remove the _id field to avoid duplication error
        const clonedData = { ...subServiceToClone.toObject() };
        delete clonedData._id;

        // Generate a new unique serviceName
                let newSubServiceName = subServiceToClone.subServiceName;
                let newSubServiceUrl = subServiceToClone.subServiceUrl;
                let suffix = 1;
        
                while (await SubService.findOne({ subServiceName: newSubServiceName })) {
                    suffix++;
                    newSubServiceName = `${subServiceToClone.subServiceName}-${suffix}`;
                    newSubServiceUrl = createUrl(newSubServiceName)
                }
        
                clonedData.subServiceName = newSubServiceName;
                clonedData.subServiceUrl = newSubServiceUrl;

        // Create a new service with the cloned data
        const clonedSubService = new SubService(clonedData);
        await clonedSubService.save();

        return res.status(201).json({ clonedSubService, success: true });
    } catch (error) {
        console.error('Error cloning subService:', error);
        res.status(500).json({ message: 'Failed to clone subService', success: false });
    }
};

