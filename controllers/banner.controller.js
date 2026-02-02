import { Banner } from '../models/banner.model.js';
import cloudinary from "../utils/cloudinary.js";
import getDataUri from "../utils/datauri.js";
import sharp from 'sharp';
// import cloudinary from "../utils/cloudinary.js";

export const addBanner = async (req, res) => {
    try {
        const { imageBase64, mobileImage, bannerinPage, altText, userId, bannerUrl } = req.body;

        const banner = new Banner({
            image: imageBase64,
            mobileImage,
            bannerinPage,
            altText,
            bannerUrl,
            userId
        });

        await banner.save();
        res.status(201).json({ banner, success: true });
    } catch (error) {
        console.error('Error uploading banner:', error);
        res.status(500).json({ message: 'Failed to upload banner', success: false });
    }
};

export const getBanners = async (req, res) => {
    try {
        const banners = await Banner.find();
        if (!banners) return res.status(404).json({ message: "Banner not found", success: false });
        return res.status(200).json({ banners });
    } catch (error) {
        console.log(error);
    }
}

export const getMobileBanners = async (req, res) => {
    try {
        const banners = await Banner.find({ bannerinPage: "Home" }).select(" bannerUrl altText");
        if (!banners) return res.status(404).json({ message: "Banner not found", success: false });
        return res.status(200).json({ banners });
    } catch (error) {
        console.log(error);
    }
}

export const getDesktopBanners = async (req, res) => {
    try {
        const banners = await Banner.find({ bannerinPage: "Home" }).select(" bannerUrl altText");
        if (!banners) return res.status(404).json({ message: "Banner not found", success: false });
        return res.status(200).json({ banners });
    } catch (error) {
        console.log(error);
    }
}

export const getMobileAboutBanners = async (req, res) => {
    try {
        const banners = await Banner.find({ bannerinPage: "About" }).select(" bannerUrl altText");
        if (!banners) return res.status(404).json({ message: "Banner not found", success: false });
        return res.status(200).json({ banners });
    } catch (error) {
        console.log(error);
    }
}

export const getDesktopAboutBanners = async (req, res) => {
    try {
        const banners = await Banner.find({ bannerinPage: "About" }).select(" bannerUrl altText");
        if (!banners) return res.status(404).json({ message: "Banner not found", success: false });
        return res.status(200).json({ banners });
    } catch (error) {
        console.log(error);
    }
}


export const getBannerById = async (req, res) => {
    try {
        const bannerId = req.params.id;
        const banner = await Banner.findById(bannerId);
        if (!banner) return res.status(404).json({ message: "Banner not found!", success: false });
        return res.status(200).json({
            banner,
            success: true
        })
    } catch (error) {
        console.log(error);
    }
}

export const updateBanner = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedData = req.body;
        const { imageBase64, mobileImage, userId, bannerinPage, altText, bannerUrl } = req.body;

        // Validate base64 data (make sure it's an image)
        if (!imageBase64 || !imageBase64.startsWith('data:image') || !mobileImage || !mobileImage.startsWith('data:image')) {
            return res.status(400).json({ message: 'Invalid image data', success: false });
        }
        // const base64Data = imageBase64.split(';base64,').pop();
        // const buffer = Buffer.from(base64Data, 'base64');

        // // Resize and compress the image using sharp
        // const compressedBuffer = await sharp(buffer)
        //     .resize(800, 600, { fit: 'inside' }) // Resize to 800x600 max, maintaining aspect ratio
        //     .jpeg({ quality: 80 }) // Convert to JPEG with 80% quality
        //     .toBuffer();

        // // Convert back to Base64 for storage (optional)
        // const compressedBase64 = `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
        const banner = await Banner.findByIdAndUpdate(id, {
            image: imageBase64, // Store the base64 string in MongoDB
            mobileImage,
            bannerUrl,
            altText,
            bannerinPage,
            userId
        }, { new: true, runValidators: true });
        if (!banner) return res.status(404).json({ message: "Banner not found!", success: false });
        return res.status(200).json({ banner, success: true });
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: error.message, success: false });
    }
};


export const deleteBanner = async (req, res) => {
    try {
        const { id } = req.params;
        const banner = await Banner.findByIdAndDelete(id);
        if (!banner) return res.status(404).json({ message: "Banner not found!", success: false });
        return res.status(200).json({
            banner,
            success: true
        })
    } catch (error) {
        console.log(error);
    }
}

export const getBannerImage = async (req, res) => {
    try {
        const bannerId = req.params.id;
        const banner = await Banner.findById(bannerId).select('image');

        if (!banner || !banner.image) {
            return res.status(404).json({ message: "Banner or image not found!", success: false });
        }

        // Reuse the parsing logic from getBlogImage
        const matches = banner.image.match(/^data:(.+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return res.status(400).send('Invalid image format');
        }

        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');

        res.set('Content-Type', mimeType);
        res.send(buffer);
    } catch (error) {
        console.error('Error fetching banner image:', error);
        res.status(500).json({ message: 'Failed to fetch banner image', success: false });
    }
};

export const getBannerMobileImage = async (req, res) => {
    try {
        const bannerId = req.params.id;
        const banner = await Banner.findById(bannerId).select('mobileImage');

        if (!banner || !banner.mobileImage) {
            return res.status(404).json({ message: "Banner or mobile image not found!", success: false });
        }

        const matches = banner.mobileImage.match(/^data:(.+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return res.status(400).send('Invalid image format');
        }

        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');

        res.set('Content-Type', mimeType);
        res.send(buffer);
    } catch (error) {
        console.error('Error fetching mobile banner image:', error);
        res.status(500).json({ message: 'Failed to fetch mobile banner image', success: false });
    }
};

export const getAboutBannerImage = async (req, res) => {
    try {
        const bannerId = req.params.id;
        const banner = await Banner.findById(bannerId).select('image');

        if (!banner || !banner.image) {
            return res.status(404).json({ message: "Banner or image not found!", success: false });
        }

        // Reuse the parsing logic from getBlogImage
        const matches = banner.image.match(/^data:(.+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return res.status(400).send('Invalid image format');
        }

        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');

        res.set('Content-Type', mimeType);
        res.send(buffer);
    } catch (error) {
        console.error('Error fetching banner image:', error);
        res.status(500).json({ message: 'Failed to fetch banner image', success: false });
    }
};

export const getAboutBannerMobileImage = async (req, res) => {
    try {
        const bannerId = req.params.id;
        const banner = await Banner.findById(bannerId).select('mobileImage');

        if (!banner || !banner.mobileImage) {
            return res.status(404).json({ message: "Banner or mobile image not found!", success: false });
        }

        const matches = banner.mobileImage.match(/^data:(.+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return res.status(400).send('Invalid image format');
        }

        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');

        res.set('Content-Type', mimeType);
        res.send(buffer);
    } catch (error) {
        console.error('Error fetching mobile banner image:', error);
        res.status(500).json({ message: 'Failed to fetch mobile banner image', success: false });
    }
};