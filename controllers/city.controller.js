import { City } from '../models/city.model.js'; // Update the path as per your project structure

// Add a new city
export const addCity = async (req, res) => {
    try {
        const { cityName,cityCode, stateId, userId } = req.body;

        // Validate required fields
        if (!cityName || !stateId || !cityCode) {
            return res.status(400).json({ message: 'City name, City Code and state ID are required', success: false });
        }

        const upperCaseCityCode = cityCode.toUpperCase();

        // Create a new city
        const city = new City({
            cityName,
            cityCode:upperCaseCityCode,
            stateId,
            userId,
        });

        await city.save();
        res.status(201).json({ city, success: true });
    } catch (error) {
        console.error('Error adding city:', error);
        res.status(500).json({ message: 'Failed to add city', success: false });
    }
};

// Get all cities
export const getCities = async (req, res) => {
    try {
        const cities = await City.find();
        if (!cities) {
            return res.status(404).json({ message: 'No cities found', success: false });
        }
        const reversedcities = cities.reverse();
        const page = parseInt(req.query.page) || 1;

        // Define the number of items per page
        const limit = 12;

        // Calculate the start and end indices for pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        // Paginate the reversed movies array
        const paginatedcities = reversedcities.slice(startIndex, endIndex);
        return res.status(200).json({ 
            cities:paginatedcities, 
            success: true ,
            pagination: {
            currentPage: page,
            totalPages: Math.ceil(cities.length / limit),
            totalcities: cities.length,
        },});
    } catch (error) {
        console.error('Error fetching cities:', error);
        res.status(500).json({ message: 'Failed to fetch cities', success: false });
    }
};

// Get city by ID
export const getCityById = async (req, res) => {
    try {
        const { id } = req.params;
        const city = await City.findById(id);
        if (!city) {
            return res.status(404).json({ message: 'City not found', success: false });
        }
        res.status(200).json({ city, success: true });
    } catch (error) {
        console.error('Error fetching city:', error);
        res.status(500).json({ message: 'Failed to fetch city', success: false });
    }
};

// Update city by ID
export const updateCity = async (req, res) => {
    try {
        const { id } = req.params;
        const { cityName,cityCode, stateId, userId } = req.body;

        const upperCaseCityCode = cityCode.toUpperCase();

        // Build updated data
        const updatedData = {
            ...(cityName && { cityName }),
            ...(upperCaseCityCode && { cityCode:upperCaseCityCode }),
            ...(stateId && { stateId }),
            ...(userId && { userId }),
        };

        const city = await City.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
        if (!city) {
            return res.status(404).json({ message: 'City not found', success: false });
        }
        res.status(200).json({ city, success: true });
    } catch (error) {
        console.error('Error updating city:', error);
        res.status(400).json({ message: 'Failed to update city', success: false });
    }
};

// Delete city by ID
export const deleteCity = async (req, res) => {
    try {
        const { id } = req.params;
        const city = await City.findByIdAndDelete(id);
        if (!city) {
            return res.status(404).json({ message: 'City not found', success: false });
        }
        res.status(200).json({ city, success: true });
    } catch (error) {
        console.error('Error deleting city:', error);
        res.status(500).json({ message: 'Failed to delete city', success: false });
    }
};
