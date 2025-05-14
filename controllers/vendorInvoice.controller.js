import { VendorInvoice } from "../models/vendorInvoice.model.js";
import admin from "firebase-admin";
import dotenv from "dotenv";
import { FirebaseToken } from '../models/firebaseToken.model.js';
import { User } from '../models/user.model.js';
import mongoose from "mongoose";
import { io } from "../index.js";
import sharp from 'sharp';

dotenv.config();

const firebaseConfig = JSON.parse(Buffer.from(process.env.FIREBASE_CREDENTIALS, "base64").toString("utf8"));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig),
    });
}


export const addVendorInvoice = async (req, res) => {
  try {
    const { invoiceImage, approveStatus, vendorId,totalAmount,stockoutIds, userId, centerId } = req.body;

    if (!invoiceImage || !invoiceImage.startsWith('data:image')) {
      return res.status(400).json({ message: 'Invalid image data', success: false });
    }

    // Extract MIME type from the Base64 string
    const mimeMatch = invoiceImage.match(/^data:(image\/(png|jpeg|jpg|webp));base64,/);
    if (!mimeMatch) {
      return res.status(400).json({ message: 'Unsupported image format', success: false });
    }

    const mimeType = mimeMatch[1]; // full MIME type like "image/png"
    const format = mimeMatch[2];   // file extension like "png", "jpeg", etc.
    const base64Data = invoiceImage.split(';base64,').pop();
    const buffer = Buffer.from(base64Data, 'base64');

    let compressedBuffer;

    // Use sharp to compress and preserve format
    
    const image = sharp(buffer).resize({ width: 1600, withoutEnlargement: true }) ;

    if (format === 'jpeg' || format === 'jpg') {
      compressedBuffer = await image.jpeg({ quality: 95 }).toBuffer();
    } else if (format === 'png') {
      compressedBuffer = await image.png({ compressionLevel: 9 }).toBuffer();
    } else if (format === 'webp') {
      compressedBuffer = await image.webp({ quality: 95 }).toBuffer();
    } else {
      return res.status(400).json({ message: 'Unsupported image format', success: false });
    }

    const compressedBase64 = `data:${mimeType};base64,${compressedBuffer.toString('base64')}`;

    const newInvoice = new VendorInvoice({
      invoiceImage: compressedBase64,
      approveStatus,
      totalAmount,stockoutIds,
      vendorId,
      userId,
      centerId,
    });

    await newInvoice.save();
    const firebasetokens = await FirebaseToken.find();
                    const users = await User.find();
                    const filteredUsers = users.filter(user => (user.role === "Super Admin" || user.role === "Center Head"));
            
                    const filterTokens = firebasetokens.filter(token =>
                        filteredUsers.some(user => user._id.toString() === token.userId.toString())
                    );
            
                    const tokens = [
                        ...new Set(
                          filterTokens
                            .filter(token => token.centerId.toString() === centerId.toString())
                            .flatMap(user => [user.webToken, user.mobileToken])  // Include both tokens
                            .filter(token => token)  // Remove undefined or null values
                        )
                      ];
    
                    const notificationMessage = {
                               title: `New Invoice Created By Vendor : ${users.find(user => user._id.toString() === userId.toString()).username}`,
                               body: `Total : ${totalAmount}`,
                                type: "Vendor Invoices",
                                date: new Date(),
                                invoiceId: newInvoice._id,
                                isView:false,
                                link:"/vendor-invoices"
                            };
    
                            const sevenDaysAgo = new Date();
                            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                            sevenDaysAgo.setHours(0, 0, 0, 0);
                    
                            // Store notifications in each matched user
                             await User.updateMany(
                                        {
                                          _id: { $in: filteredUsers.map(user => user._id) },
                                          $or: [
                                            { centerId: new mongoose.Types.ObjectId(centerId) },
                                            { centerId: centerId.toString() }
                                          ]
                                        },
                                        [
                                          {
                                            $set: {
                                              notifications: {
                                                $filter: {
                                                  input: { $ifNull: ["$notifications", []] }, // ensures it's always an array
                                                  as: "notif",
                                                  cond: { $gte: [{ $toDate: "$$notif.date" }, sevenDaysAgo] }
                                                }
                                              }
                                            }
                                          }
                                        ]
                                      );
    
                            await User.updateMany(
                                { 
                                    _id: { $in: filteredUsers.map(user => user._id) },
                                    $or: [
                                        { centerId: new mongoose.Types.ObjectId(centerId) }, // Match ObjectId
                                        { centerId: centerId.toString() } // Match string version
                                    ]
                                },
                                { 
                                    $push: { notifications: notificationMessage },
                                }
                            );
    
                            io.emit("notification",  { success: true }  );
                    
                            // Send Firebase Notification
                            if (tokens.length > 0) {
                                const message = {
                                    notification: {
                                        title: notificationMessage.title,
                                        body: notificationMessage.body
                                    },
                                    data: { // ✅ Add URL inside "data"
                                        url: "https://console.interventionalradiology.co.in"
                                    },
                                    tokens: tokens, // Use tokens array for multicast
                                };
                    
                                admin.messaging().sendEachForMulticast(message)
                                    .then(response => {
                                        response.responses.forEach((resp, index) => {
                                            if (!resp.success) {
                                                console.error(`Error sending to token ${tokens[index]}:`, resp.error);
                                            }
                                        });
                                    })
                                    .catch(error => {
                                        console.error("Firebase Messaging Error:", error);
                                    });
                            }
    res.status(201).json({ invoice: newInvoice, success: true });
  } catch (error) {
    console.error("Error uploading vendor invoice:", error);
    res.status(500).json({ message: "Failed to upload vendor invoice", success: false });
  }
};


// Get all Vendor Invoices
export const getVendorInvoices = async (req, res) => {
    try {
      const { id } = req.params;
      const { page = 1, vendor = "" } = req.query;
      const limit = 10;
      const skip = (page - 1) * limit;
  
      // Create a search filter
      const searchFilter = {};
      if (vendor) {
        searchFilter.vendorId = vendor;
      }
  
      // Total matching invoices (no pagination)
      const totalInvoices = await VendorInvoice.countDocuments({ centerId: id, ...searchFilter });
  
      // Paginated invoices
      const paginatedInvoices = await VendorInvoice.find({ centerId: id, ...searchFilter })
        .sort({ _id: -1 }) // Sort newest first
        .skip(skip)
        .limit(limit);
  
      res.status(200).json({
        invoices: paginatedInvoices,
        success: true,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalInvoices / limit),
          totalInvoices,
        },
      });
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices", success: false });
    }
  };
  

// Get Vendor Invoice by ID
export const getVendorInvoiceById = async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const invoice = await VendorInvoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found", success: false });
    }
    return res.status(200).json({ invoice, success: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to fetch invoice", success: false });
  }
};

export const getVendorInvoicesByVendorId = async (req, res) => {
    try {
        const { id: vendorId } = req.params;
        const { centerId, page = 1 } = req.query;

        if (!centerId) {
            return res.status(400).json({ message: 'centerId is required', success: false });
        }

        // Find matching stockouts
        const invoices = await VendorInvoice.find({
            vendorId,
            centerId,
        });

        if (!invoices) {
            return res.status(404).json({ message: 'No invoices found', success: false });
        }

        const filteredInvoices = invoices.reverse();

        const limit = 12;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

        return res.status(200).json({
            invoices: paginatedInvoices,
            success: true,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(filteredInvoices.length / limit),
                totalInvoices: filteredInvoices.length,
            },
        });
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ message: 'Failed to fetch invoices', success: false });
    }
};

// Update Vendor Invoice by ID
export const updateVendorInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { invoiceImage, approveStatus,totalAmount,stockoutIds, vendorId, userId, centerId } = req.body;
    if (!invoiceImage || !invoiceImage.startsWith('data:image')) {
        return res.status(400).json({ message: 'Invalid image data', success: false });
      }
  
      // Extract MIME type from the Base64 string
      const mimeMatch = invoiceImage.match(/^data:(image\/(png|jpeg|jpg|webp));base64,/);
      if (!mimeMatch) {
        return res.status(400).json({ message: 'Unsupported image format', success: false });
      }
  
      const mimeType = mimeMatch[1]; // full MIME type like "image/png"
      const format = mimeMatch[2];   // file extension like "png", "jpeg", etc.
      const base64Data = invoiceImage.split(';base64,').pop();
      const buffer = Buffer.from(base64Data, 'base64');
  
      let compressedBuffer;
  
      // Use sharp to compress and preserve format
      const image = sharp(buffer).resize({ width: 1600, withoutEnlargement: true }) ;

    if (format === 'jpeg' || format === 'jpg') {
      compressedBuffer = await image.jpeg({ quality: 95 }).toBuffer();
    } else if (format === 'png') {
      compressedBuffer = await image.png({ compressionLevel: 9 }).toBuffer();
    } else if (format === 'webp') {
      compressedBuffer = await image.webp({ quality: 95 }).toBuffer();
    } else {
      return res.status(400).json({ message: 'Unsupported image format', success: false });
    }
  
      const compressedBase64 = `data:${mimeType};base64,${compressedBuffer.toString('base64')}`;

    const updatedData = {
      invoiceImage:compressedBase64,
      approveStatus,
      totalAmount,stockoutIds,
      vendorId,
      userId,
      centerId,
    };

    const updatedInvoice = await VendorInvoice.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });

    if (!updatedInvoice) {
      return res.status(404).json({ message: "Invoice not found", success: false });
    }
    const firebasetokens = await FirebaseToken.find();
                    const users = await User.find();
                    const filteredUsers = users.filter(user => (user.role === "Super Admin" || user.role === "Center Head"));
            
                    const filterTokens = firebasetokens.filter(token =>
                        filteredUsers.some(user => user._id.toString() === token.userId.toString())
                    );
            
                    const tokens = [
                        ...new Set(
                          filterTokens
                            .filter(token => token.centerId.toString() === centerId.toString())
                            .flatMap(user => [user.webToken, user.mobileToken])  // Include both tokens
                            .filter(token => token)  // Remove undefined or null values
                        )
                      ];
    
                    const notificationMessage = {
                               title: `Invoice Updated By Vendor : ${users.find(user => user._id.toString() === userId.toString()).username}`,
                               body: `Total : ${totalAmount}`,
                                type: "Vendor Invoices",
                                date: new Date(),
                                invoiceId: updatedInvoice._id,
                                isView:false,
                                link:"/vendor-invoices"
                            };
    
                            const sevenDaysAgo = new Date();
                            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                            sevenDaysAgo.setHours(0, 0, 0, 0);
                    
                            // Store notifications in each matched user
                             await User.updateMany(
                                        {
                                          _id: { $in: filteredUsers.map(user => user._id) },
                                          $or: [
                                            { centerId: new mongoose.Types.ObjectId(centerId) },
                                            { centerId: centerId.toString() }
                                          ]
                                        },
                                        [
                                          {
                                            $set: {
                                              notifications: {
                                                $filter: {
                                                  input: { $ifNull: ["$notifications", []] }, // ensures it's always an array
                                                  as: "notif",
                                                  cond: { $gte: [{ $toDate: "$$notif.date" }, sevenDaysAgo] }
                                                }
                                              }
                                            }
                                          }
                                        ]
                                      );
    
                            await User.updateMany(
                                { 
                                    _id: { $in: filteredUsers.map(user => user._id) },
                                    $or: [
                                        { centerId: new mongoose.Types.ObjectId(centerId) }, // Match ObjectId
                                        { centerId: centerId.toString() } // Match string version
                                    ]
                                },
                                { 
                                    $push: { notifications: notificationMessage },
                                }
                            );
    
                            io.emit("notification",  { success: true }  );
                    
                            // Send Firebase Notification
                            if (tokens.length > 0) {
                                const message = {
                                    notification: {
                                        title: notificationMessage.title,
                                        body: notificationMessage.body
                                    },
                                    data: { // ✅ Add URL inside "data"
                                        url: "https://console.interventionalradiology.co.in"
                                    },
                                    tokens: tokens, // Use tokens array for multicast
                                };
                    
                                admin.messaging().sendEachForMulticast(message)
                                    .then(response => {
                                        response.responses.forEach((resp, index) => {
                                            if (!resp.success) {
                                                console.error(`Error sending to token ${tokens[index]}:`, resp.error);
                                            }
                                        });
                                    })
                                    .catch(error => {
                                        console.error("Firebase Messaging Error:", error);
                                    });
                            }
    return res.status(200).json({ invoice: updatedInvoice, success: true });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message, success: false });
  }
};

export const approveVendorInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { approveStatus } = req.body;

    const updatedInvoice = await VendorInvoice.findByIdAndUpdate(
      id,
      { approveStatus },
      { new: true, runValidators: true }
    );

    if (!updatedInvoice) {
      return res.status(404).json({ message: 'Invoice not found', success: false });
    }

    const userId = updatedInvoice.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found', success: false });
    }

    const userTokens = await FirebaseToken.find({ userId });
    const tokens = [
      ...new Set(
        userTokens
          .flatMap(token => [token.webToken, token.mobileToken])
          .filter(token => token) // remove nulls/undefined
      )
    ];

    const notificationMessage = {
      title: `Your Invoice Approval Changed`,
      body: `Your invoice status is now: ${approveStatus}`,
      type: "Vendor Invoice",
      date: new Date(),
      invoiceId: updatedInvoice._id,
      isView: false,
      link: "/vendor-invoice"
    };

    // Keep only recent notifications (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    await User.updateOne(
      { _id: userId },
      [
        {
          $set: {
            notifications: {
              $filter: {
                input: { $ifNull: ["$notifications", []] },
                as: "notif",
                cond: { $gte: [{ $toDate: "$$notif.date" }, sevenDaysAgo] }
              }
            }
          }
        }
      ]
    );

    // Push the new notification
    await User.updateOne(
      { _id: userId },
      { $push: { notifications: notificationMessage } }
    );

    // Emit socket event
    io.emit("notification", { success: true });

    // Send Firebase notification if tokens exist
    if (tokens.length > 0) {
      const message = {
        notification: {
          title: notificationMessage.title,
          body: notificationMessage.body
        },
        data: {
          url: "https://console.interventionalradiology.co.in"
        },
        tokens
      };

      admin.messaging().sendEachForMulticast(message)
        .then(response => {
          response.responses.forEach((resp, index) => {
            if (!resp.success) {
              console.error(`Error sending to token ${tokens[index]}:`, resp.error);
            }
          });
        })
        .catch(error => {
          console.error("Firebase Messaging Error:", error);
        });
    }

    return res.status(200).json({ invoice: updatedInvoice, success: true });
  } catch (error) {
    console.error('Error approving invoice:', error);
    res.status(500).json({ message: 'Failed to approve invoice', success: false });
  }
};


// Delete Vendor Invoice by ID
export const deleteVendorInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedInvoice = await VendorInvoice.findByIdAndDelete(id);
    if (!deletedInvoice) {
      return res.status(404).json({ message: "Invoice not found", success: false });
    }
    return res.status(200).json({ invoice: deletedInvoice, success: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to delete invoice", success: false });
  }
};
