import { FirebaseToken } from '../models/firebaseToken.model.js'; // Adjust path based on your file structure

// Add a new contact
export const addToken = async (req, res) => {
    try {
        const { userId, webToken, mobileToken ,centerId} = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "userId is required"
            });
        }

        // Find token record for this user
        let existingToken = await FirebaseToken.findOne({ userId });

        if (existingToken) {
            let updated = false;

            // Update ONLY if different
            if (webToken && existingToken.webToken !== webToken) {
                existingToken.webToken = webToken;
                updated = true;
            }

            if (mobileToken && existingToken.mobileToken !== mobileToken) {
                existingToken.mobileToken = mobileToken;
                updated = true;
            }

            if (updated) {
                await existingToken.save();
            }

            return res.status(200).json({
                success: true,
                message: updated ? "Token updated successfully" : "Token already up-to-date",
                token: existingToken
            });
        }

        // No token found → create new one
        const newToken = new FirebaseToken({
            userId,
            webToken: webToken || undefined,
            mobileToken: mobileToken || undefined,
            centerId
        });

        await newToken.save();

        return res.status(201).json({
            success: true,
            message: "Token added successfully",
            token: newToken
        });

    } catch (error) {
        console.error("addToken error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
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