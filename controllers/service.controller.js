import { Service } from '../models/service.model.js';
import { ServiceRanking } from '../models/service_ranking.model.js';
import { ServiceSearch } from '../models/service_search.model.js';
import { SubService } from '../models/sub_service.model.js';
import sharp from 'sharp';

// Add a new service
export const addService = async (req, res) => {
    try {
        let { serviceName, serviceDescription, serviceImage,serviceType, whyChoose,whyChooseName, howWorks,howWorksName,beforeAfterGallary = [], others, procedureId,categoryId, diseaseId, serviceEnabled,serviceUrl,seoTitle,seoDescription, userId} = req.body;
        
        // Validate base64 image data
        if (!serviceImage || !serviceImage.startsWith('data:image') ) {
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

        // Compress the main service image
        const compressedServiceBase64 = await compressImage(serviceImage);


        // Compress all images in beforeAfterGallary array, if it exists and is not empty
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

        const service = new Service({
            serviceName,
            serviceDescription,
            serviceImage:compressedServiceBase64, // Store the base64 image data
            serviceType,
            whyChoose,
            whyChooseName,
            howWorks,
            howWorksName,
            beforeAfterGallary,
            others,
            procedureId,
            categoryId,
            diseaseId,
            serviceEnabled,
            serviceUrl,
            seoTitle,seoDescription,
            userId
        });

        await service.save();
        res.status(201).json({ service, success: true });
    } catch (error) {
        console.error('Error uploading service:', error);
        res.status(500).json({ message: 'Failed to upload service', success: false });
    }
};

// Get all services
// export const getServices = async (req, res) => {
//     try {
//         const services = await Service.find().select('serviceName serviceUrl serviceImage procedureId serviceType serviceEnabled').populate('procedureId'); // Populating category data
//         if (!services) return res.status(404).json({ message: "Services not found", success: false });
//         return res.status(200).json({ services });
//     } catch (error) {
//         console.log(error);
//         res.status(500).json({ message: 'Failed to fetch services', success: false });
//     }
// };

export const getServices = async (req, res) => {
    try {
        const services = await Service.find().select('serviceName serviceUrl serviceDescription serviceImage procedureId categoryId diseaseId serviceType serviceEnabled').populate('procedureId');
        if (!services) {
            return res.status(404).json({ message: 'No services found', success: false });
        }
        const reversedservices = services.reverse();
        const page = parseInt(req.query.page) || 1;

        // Define the number of items per page
        const limit = 12;

        // Calculate the start and end indices for pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        // Paginate the reversed movies array
        const paginatedservices = reversedservices.slice(startIndex, endIndex);
        res.status(200).json({ services:paginatedservices, 
            success: true ,
            pagination: {
            currentPage: page,
            totalPages: Math.ceil(services.length / limit),
            totalServices: services.length,} });
    } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).json({ message: 'Failed to fetch services', success: false });
    }
};

export const getEnabledServices = async (req, res) => {
    try {
        // Fetch only enabled services
        const services = await Service.find({ serviceEnabled: true })
            .select('serviceName serviceUrl serviceDescription serviceImage procedureId categoryId diseaseId serviceType serviceEnabled')
            .populate('procedureId');

        if (!services.length) {
            return res.status(404).json({ message: 'No enabled services found', success: false });
        }

        // Reverse order for latest-first
        const reversedServices = services.reverse();
        const page = parseInt(req.query.page) || 1;
        const limit = 12;

        // Calculate pagination indices
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        // Paginate the reversed array
        const paginatedServices = reversedServices.slice(startIndex, endIndex);

        res.status(200).json({ 
            services: paginatedServices, 
            success: true,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(services.length / limit),
                totalServices: services.length,
            }
        });
    } catch (error) {
        console.error('Error fetching enabled services:', error);
        res.status(500).json({ message: 'Failed to fetch enabled services', success: false });
    }
};


export const searchServices = async (req, res) => {
    try {
        const { search } = req.query;
        if (!search) {
            return res.status(400).json({ message: 'Search query is required', success: false });
        }

        const regex = new RegExp(search, 'i'); // Case-insensitive search

        const services = await Service.find({
            $or: [
                { serviceName: regex },
            ]
        });

        if (!services) {
            return res.status(404).json({ message: 'No services found', success: false });
        }
        const page = parseInt(req.query.page) || 1;

        // Define the number of items per page
        const limit = 12;

        // Calculate the start and end indices for pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        // Paginate the reversed movies array
        const paginatedservices = services.slice(startIndex, endIndex);
        res.status(200).json({ services:paginatedservices, 
            success: true ,
            pagination: {
            currentPage: page,
            totalPages: Math.ceil(services.length / limit),
            totalServices: services.length,} });
    } catch (error) {
        console.error('Error searching services:', error);
        res.status(500).json({ message: 'Failed to search services', success: false });
    }
};

// Get service by ID
export const getServiceById = async (req, res) => {
    try {
        const serviceId = req.params.id;
        const service = await Service.findById(serviceId).populate('procedureId'); // Populating category data
        if (!service) return res.status(404).json({ message: "Service not found!", success: false });
        return res.status(200).json({ service, success: true });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Failed to fetch service', success: false });
    }
};

export const getServiceByUrl = async (req, res) => {
    try {
        const serviceUrl = req.params.id;
        const service = await Service.findOne({serviceUrl}).populate('procedureId'); // Populating category data
        if (!service) return res.status(404).json({ message: "Service not found!", success: false });
        return res.status(200).json({ service, success: true });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Failed to fetch service', success: false });
    }
};

export const getServicesByCategory = async (req, res) => {
    try {
        const { id } = req.params; // Extract the service ID from the request parameters
        const services = await Service.find({ procedureId: id })
        .select('serviceName serviceUrl serviceDescription serviceImage procedureId categoryId diseaseId serviceType serviceEnabled'); // Correctly query by serviceId
        if (!services) {
            return res.status(404).json({ message: "services not found!", success: false });
        }
        return res.status(200).json({ services, success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch services", success: false });
    }
};

// Update service by ID
export const updateService = async (req, res) => {
    try {
        const { id } = req.params;
        let { serviceName, serviceDescription, serviceImage,serviceType, whyChoose,whyChooseName, howWorks,howWorksName,beforeAfterGallary = [], others, procedureId, categoryId, diseaseId, serviceEnabled,serviceUrl,seoTitle,seoDescription,userId } = req.body;
         
        const existingService = await Service.findById(id);
        if (!existingService) {
            return res.status(404).json({ message: "Service not found!", success: false });
        }

        // Initialize oldUrls array and add the previous serviceUrl if it's different
        let oldUrls = existingService.oldUrls || [];
        if (existingService.serviceUrl && existingService.serviceUrl !== serviceUrl && !oldUrls.includes(existingService.serviceUrl)) {
            oldUrls.push(existingService.serviceUrl);
        }
        // Validate base64 image data
        if (serviceImage && !serviceImage.startsWith('data:image')) {
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

        // Compress the main service image
        const compressedServiceBase64 = await compressImage(serviceImage);

        // Compress all images in beforeAfterGallary array, if it exists and is not empty
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
            serviceName,
            serviceDescription,
            ...(compressedServiceBase64 && { serviceImage: compressedServiceBase64 }), // Only update image if new image is provided
            serviceType,
            whyChoose,
            whyChooseName,
            howWorks,
            howWorksName,
            beforeAfterGallary,
            others,
            procedureId,
            categoryId,
            diseaseId,
            serviceEnabled,
            serviceUrl,seoTitle,seoDescription,
            userId,
            oldUrls 
        };

        const service = await Service.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
        if (!service) return res.status(404).json({ message: "Service not found!", success: false });
        return res.status(200).json({ service, success: true });
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: error.message, success: false });
    }
};

export const onOffService = async (req, res) => {
    try {
        const { id } = req.params;
        let { serviceEnabled } = req.body;

        const existingService = await Service.findById(id)

        
        const updatedData = {
            serviceName :existingService.serviceName,
            serviceDescription:existingService.serviceDescription,
            serviceImage:existingService.serviceImage, // Only update image if new image is provided
            serviceType:existingService.serviceType,
            whyChoose:existingService.whyChoose,
            whyChooseName:existingService.whyChooseName,
            howWorks:existingService.howWorks,
            howWorksName:existingService.howWorksName,
            beforeAfterGallary:existingService.beforeAfterGallary,
            others:existingService.others,
            procedureId:existingService.procedureId,
            categoryId:existingService.categoryId,
            diseaseId:existingService.diseaseId,
            serviceEnabled:serviceEnabled,
            serviceUrl:existingService.serviceUrl,
            seoTitle:existingService.seoTitle,
            seoDescription:existingService.seoDescription,
            userId:existingService.userId,
            oldUrls:existingService.oldUrls
        };

        const service = await Service.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
        if (!service) return res.status(404).json({ message: "Service not found!", success: false });
        return res.status(200).json({ service, success: true });
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: error.message, success: false });
    }
};

// Delete service by ID
export const deleteService = async (req, res) => {
    try {
        const { id } = req.params;
        const service = await Service.findByIdAndDelete(id);
        if (!service) return res.status(404).json({ message: "Service not found!", success: false });
        return res.status(200).json({ service, success: true });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Failed to delete service', success: false });
    }
};


export const getServicesFrontend = async (req, res) => {
    try {
        const services = await Service.find()
        .select('serviceName serviceUrl procedureId categoryId diseaseId serviceType serviceEnabled')
        .populate('procedureId'); // Populating category data
        if (!services) return res.status(404).json({ message: "Services not found", success: false });
        return res.status(200).json({ services });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Failed to fetch services', success: false });
    }
};

export const getServicesBeforeAfter = async (req, res) => {
    try {
        const services = await Service.find()
        .select('serviceName beforeAfterGallary serviceEnabled');
        if (!services) return res.status(404).json({ message: "Services not found", success: false });
        return res.status(200).json({ services });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Failed to fetch services', success: false });
    }
};

// Clone service by ID
function createUrl(name) {
    return name
      .trim()                        // Remove extra spaces
      .toLowerCase()                 // Convert to lowercase
      .replace(/\s+/g, '-')          // Replace spaces with hyphens
      .replace(/[^a-z0-9-]/g, '');   // Remove special characters except hyphens
  }
export const cloneService = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the service to clone
        const serviceToClone = await Service.findById(id);
        if (!serviceToClone) {
            return res.status(404).json({ message: "Service to clone not found!", success: false });
        }

        // Remove the _id field to avoid duplication error
        const clonedData = { ...serviceToClone.toObject() };
        delete clonedData._id;

        // Generate a new unique serviceName
        let newServiceName = serviceToClone.serviceName;
        let newServiceUrl = serviceToClone.serviceUrl;
        let suffix = 1;

        while (await Service.findOne({ serviceName: newServiceName })) {
            suffix++;
            newServiceName = `${serviceToClone.serviceName}-${suffix}`;
            newServiceUrl = createUrl(newServiceName)
        }

        clonedData.serviceName = newServiceName;
        clonedData.serviceUrl = newServiceUrl;

        // Create a new service with the cloned data
        const clonedService = new Service(clonedData);
        await clonedService.save();

        return res.status(201).json({ clonedService, success: true });
    } catch (error) {
        console.error('Error cloning service:', error);
        res.status(500).json({ message: 'Failed to clone service', success: false });
    }
};


export const addServiceRanking = async (req, res) => {
    try {
        let { ranking,userId} = req.body;
        const serviceRanking = await ServiceRanking.findOneAndUpdate(
                  {}, 
                  { ranking,userId}, 
                  { new: true, upsert: true }
                );

        await serviceRanking.save();
        res.status(201).json({ serviceRanking, success: true });
    } catch (error) {
        console.error('Error uploading serviceRanking:', error);
        res.status(500).json({ message: 'Failed to upload serviceRanking', success: false });
    }
};

export const getServiceRanking = async (req, res) => {
  try {
      const serviceRankings = await ServiceRanking.find();
      if (!serviceRankings) return res.status(404).json({ message: "Service Rankings not found", success: false });
      return res.status(200).json({ serviceRankings });
  } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Failed to fetch service Rankings', success: false });
  }
};

export const getServicesAfterRanking = async (req, res) => {
    try {
        // Fetch the service ranking
        const serviceRanking = await ServiceRanking.findOne().select('ranking');
        if (!serviceRanking || !serviceRanking.ranking || serviceRanking.ranking.length === 0) {
            return res.status(404).json({ message: "No ranked services found", success: false });
        }

        // Extract service IDs from the ranking
        const rankedServiceIds = serviceRanking.ranking.map(item => item.value);

        // Fetch services that match the ranked IDs
        const mainservices = await Service.find({ _id: { $in: rankedServiceIds } })
        .select('serviceName serviceUrl serviceDescription serviceImage');

        const subservices = await SubService.find({ _id: { $in: rankedServiceIds } })
        .select('subServiceName subServiceUrl subServiceDescription subServiceImage');

        const services = [...mainservices,...subservices];

        if (!services || services.length === 0) {
            return res.status(404).json({ message: "Ranked services not found", success: false });
        }

        // Sort services based on their rank
        const sortedServices = rankedServiceIds.map(id => services.find(service => service._id.toString() === id));

        return res.status(200).json({ services: sortedServices, success: true });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Failed to fetch ranked services', success: false });
    }
};

export const addServiceInSearch = async (req, res) => {
    try {
        let { ranking,userId} = req.body;
        const serviceRanking = await ServiceSearch.findOneAndUpdate(
                  {}, 
                  { ranking,userId}, 
                  { new: true, upsert: true }
                );

        await serviceRanking.save();
        res.status(201).json({ serviceRanking, success: true });
    } catch (error) {
        console.error('Error uploading serviceRanking:', error);
        res.status(500).json({ message: 'Failed to upload serviceRanking', success: false });
    }
};

export const getServiceInSearch = async (req, res) => {
  try {
      const serviceRankings = await ServiceSearch.find();
      if (!serviceRankings) return res.status(404).json({ message: "Service Rankings not found", success: false });
      return res.status(200).json({ serviceRankings });
  } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Failed to fetch service Rankings', success: false });
  }
};

export const getServicesAfterInSearch = async (req, res) => {
    try {
        // Fetch the service ranking
        const serviceRanking = await ServiceSearch.findOne().select('ranking');
        if (!serviceRanking || !serviceRanking.ranking || serviceRanking.ranking.length === 0) {
            return res.status(404).json({ message: "No ranked services found", success: false });
        }

        // Extract service IDs from the ranking
        const rankedServiceIds = serviceRanking.ranking.map(item => item.value);

        // Fetch services that match the ranked IDs
        const mainservices = await Service.find({ _id: { $in: rankedServiceIds } })
        .select('serviceName serviceUrl serviceDescription serviceImage');

        const subservices = await SubService.find({ _id: { $in: rankedServiceIds } })
        .select('subServiceName subServiceUrl subServiceDescription subServiceImage');

        const services = [...mainservices,...subservices];

        if (!services || services.length === 0) {
            return res.status(404).json({ message: "Ranked services not found", success: false });
        }

        // Sort services based on their rank
        const sortedServices = rankedServiceIds.map(id => services.find(service => service._id.toString() === id));

        return res.status(200).json({ services: sortedServices, success: true });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Failed to fetch ranked services', success: false });
    }
};





