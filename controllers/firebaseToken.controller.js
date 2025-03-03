import { FirebaseToken } from '../models/firebaseToken.model.js'; // Adjust path based on your file structure

// Add a new contact
export const addToken = async (req, res) => {
    try {
        const { userId, webToken, mobileToken, centerId} = req.body;

        // Validate required fields
        if (!userId) {
            return res.status(400).json({ 
                message: 'Please provide all required fields', 
                success: false 
            });
        }

        // Check if a contact with the same email or phone already exists
        const existingToken = await FirebaseToken.findOne({
            $or: [{ userId }]
        });

        if (existingToken) {
            // Update the existing contact
            existingToken.userId = userId;
           webToken ? existingToken.webToken = webToken : null;
           mobileToken ? existingToken.mobileToken = mobileToken : null;
            existingToken.centerId = centerId;
            await existingToken.save();

            return res.status(200).json({ 
                message: 'Token updated successfully', 
                token: existingToken, 
                success: true 
            });
        }

        // Create a new contact document if no existing contact is found
        const newToken = new FirebaseToken({
            userId, webToken, mobileToken, centerId
        });

        // Save the new contact to the database
        await newToken.save();

        res.status(201).json({ 
            message: 'Token added successfully', 
            token: newToken, 
            success: true 
        });
    } catch (error) {
        console.error('Error adding/updating token:', error);
        res.status(500).json({ 
            message: 'Failed to process the request', 
            success: false 
        });
    }
};


// Get all contacts
export const getTokens = async (req, res) => {
    try {
        const { id } = req.params;
        const tokens = await FirebaseToken.find({centerId: id ,});
        if (!tokens ) {
            return res.status(404).json({ message: "No tokens found", success: false });
        }
        return res.status(200).json({ tokens });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Failed to fetch tokens', success: false });
    }
};