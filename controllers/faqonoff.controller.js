import { FaqOnOff } from "../models/faqonoff.model.js";

export const faqOnOff = async (req, res) => {
    try {
        const { faqEnabled } = req.body;
    
        if (typeof faqEnabled !== "boolean") {
          return res.status(400).json({ message: "Invalid value for faqEnabled." });
        }
    
        // Use findOneAndUpdate to update or create the document, ensuring only one exists
        const faqStatus = await FaqOnOff.findOneAndUpdate(
          {}, // Empty filter ensures it checks the entire collection
          { faqEnabled }, // Set the new surveyEnabled value
          { new: true, upsert: true } // Create the document if it doesn't exist
        );
    
        res.status(200).json({
          message: "Faq status updated successfully.",
          data: faqStatus,
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error." });
      }
}

export const getFaqOnOff = async (req, res) => {
  try {
      const faqonoffs = await FaqOnOff.find();
      if (!faqonoffs) return res.status(404).json({ message: "Faq On Off not found", success: false });
      return res.status(200).json({ faqonoffs });
  } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Failed to fetch faq on off', success: false });
  }
};