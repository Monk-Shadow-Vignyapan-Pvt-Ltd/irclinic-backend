import { VideoQueue } from "../models/videoQueue.model.js";


// Add a new video to the queue
export const addVideoToQueue = async (req, res) => {
    try {
        const { videoLink, userId } = req.body;

        if (!videoLink) {
            return res.status(400).json({ message: "Video link is required", success: false });
        }

        const video = new VideoQueue({ videoLink, userId });
        await video.save();

        res.status(201).json({ video, success: true });
    } catch (error) {
        console.error("Error adding video to queue:", error);
        res.status(500).json({ message: "Failed to add video", success: false });
    }
};

// Get all videos in the queue
export const getVideoQueue = async (req, res) => {
    try {
        const videos = await VideoQueue.find();
        if (!videos ) {
            return res.status(404).json({ message: "No videos found", success: false });
        }
        res.status(200).json({ videos, success: true });
    } catch (error) {
        console.error("Error fetching video queue:", error);
        res.status(500).json({ message: "Failed to fetch videos", success: false });
    }
};

// Get video by ID
export const getVideoById = async (req, res) => {
    try {
        const { id } = req.params;
        const video = await VideoQueue.findById(id);

        if (!video) {
            return res.status(404).json({ message: "Video not found", success: false });
        }

        res.status(200).json({ video, success: true });
    } catch (error) {
        console.error("Error fetching video by ID:", error);
        res.status(500).json({ message: "Failed to fetch video", success: false });
    }
};

// Update video in the queue by ID
export const updateVideoQueue = async (req, res) => {
    try {
        const { id } = req.params;
        const { videoLink, userId } = req.body;

        if (!videoLink) {
            return res.status(400).json({ message: "Video link is required", success: false });
        }

        const updatedVideo = await VideoQueue.findByIdAndUpdate(
            id,
            { videoLink, userId },
            { new: true, runValidators: true }
        );

        if (!updatedVideo) {
            return res.status(404).json({ message: "Video not found", success: false });
        }

        res.status(200).json({ video: updatedVideo, success: true });
    } catch (error) {
        console.error("Error updating video in queue:", error);
        res.status(500).json({ message: "Failed to update video", success: false });
    }
};

// Delete video from the queue by ID
export const deleteVideoFromQueue = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedVideo = await VideoQueue.findByIdAndDelete(id);

        if (!deletedVideo) {
            return res.status(404).json({ message: "Video not found", success: false });
        }

        res.status(200).json({ video: deletedVideo, success: true });
    } catch (error) {
        console.error("Error deleting video from queue:", error);
        res.status(500).json({ message: "Failed to delete video", success: false });
    }
};
