import { Stockout } from '../models/stockout.model.js'; // Update the path as per your project structure
import { Inventory } from '../models/inventory.model.js';
import { Stockin } from '../models/stockin.model.js';
import admin from "firebase-admin";
import dotenv from "dotenv";
import { FirebaseToken } from '../models/firebaseToken.model.js';
import { User } from '../models/user.model.js';
import mongoose from "mongoose";
import { io } from "../index.js";
import ExcelJS from 'exceljs';

dotenv.config();

const firebaseConfig = JSON.parse(Buffer.from(process.env.FIREBASE_CREDENTIALS, "base64").toString("utf8"));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig),
    });
}

// Add a new stockin
export const addStockout = async (req, res) => {
    try {
        const { vendorId,inventoryId, totalStock,others, centerId,appointmentId,appointmentType,hospitalId } = req.body;

        // Validate required fields
        if (!vendorId || !inventoryId  || !centerId || !appointmentType) {
            return res.status(400).json({ 
                message: 'Vendor Id,Inventory ID, Appointment Type, and Center ID are required', 
                success: false 
            });
        }

        const inventory = await Inventory.findOne({_id:inventoryId}).select("ignoreStockLevel stockLevel inventoryName") ;
        const stockin = await Stockin.findOne({inventoryId}).select("totalStock vendorId");
        if(!inventory.ignoreStockLevel){
            if((parseFloat(stockin.totalStock) - parseFloat(totalStock) ) < parseFloat(inventory.stockLevel)){
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
                                                title: `Please Maintain Stock Level For Inventory`,
                                                body: ` ${inventory.inventoryName}`,
                                                 type: "Stock Level",
                                                 date: new Date(),
                                                 inventoryId: inventory._id,
                                                 isView:false,
                                                 link:"/stock-in"
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
            }
        }
        

        // Create a new stockin
        const stockout = new Stockout({vendorId, inventoryId, totalStock,others, centerId,appointmentId,appointmentType,hospitalId });

        await stockout.save();
        res.status(201).json({ stockout, success: true });
    } catch (error) {
        console.error('Error adding stockout:', error);
        res.status(500).json({ message: 'Failed to add stockout', success: false });
    }
};

// Get all stockins
export const getStockouts = async (req, res) => {
    try {
        const { id } = req.params;
        const stockouts = await Stockout.find({ centerId: id });
        if (!stockouts) {
            return res.status(404).json({ message: 'No stockouts found', success: false });
        }
        const reversedstockouts = stockouts.reverse();
        const page = parseInt(req.query.page) || 1;

        // Define the number of items per page
        const limit = 12;

        // Calculate the start and end indices for pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        // Paginate the reversed movies array
        const paginatedstockouts = reversedstockouts.slice(startIndex, endIndex);
        return res.status(200).json({ 
            stockouts:paginatedstockouts, 
            success: true ,
            pagination: {
            currentPage: page,
            totalPages: Math.ceil(stockouts.length / limit),
            totalstockouts: stockouts.length,
        },});
    } catch (error) {
        console.error('Error fetching stockouts:', error);
        res.status(500).json({ message: 'Failed to fetch stockouts', success: false });
    }
};

export const getStockoutById = async (req, res) => {
    try {
        const { id } = req.params;
        const stockout = await Stockout.findById(id);
        if (!stockout) {
            return res.status(404).json({ message: 'stockout not found', success: false });
        }
        res.status(200).json({ stockout, success: true });
    } catch (error) {
        console.error('Error fetching stockout:', error);
        res.status(500).json({ message: 'Failed to fetch stockout', success: false });
    }
};

export const getStockoutsByVendorId = async (req, res) => {
    try {
        const { id: vendorId } = req.params;
        const { centerId, page = 1 } = req.query;

        if (!centerId) {
            return res.status(400).json({ message: 'centerId is required', success: false });
        }

        // Find matching stockouts
        const stockouts = await Stockout.find({
            vendorId,
            centerId,
        });

        if (!stockouts) {
            return res.status(404).json({ message: 'No stockouts found', success: false });
        }

        const filteredStockouts = stockouts.filter(stockout => stockout.totalStock > 0).reverse();

        const limit = 12;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedStockouts = filteredStockouts.slice(startIndex, endIndex);

        return res.status(200).json({
            stockouts: paginatedStockouts,
            success: true,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(filteredStockouts.length / limit),
                totalStockouts: filteredStockouts.length,
            },
        });
    } catch (error) {
        console.error('Error fetching stockouts:', error);
        res.status(500).json({ message: 'Failed to fetch stockouts', success: false });
    }
};

export const getAllStockoutsByVendorId = async (req, res) => {
    try {
        const { id: vendorId } = req.params;
        const { centerId, } = req.query;

        if (!centerId) {
            return res.status(400).json({ message: 'centerId is required', success: false });
        }

        // Find matching stockouts
        const stockouts = await Stockout.find({
            vendorId,
            centerId,
            $or: [
                { invoiceId: { $exists: false } },
                { invoiceId: null }
            ]
            });

       

        return res.status(200).json({
            stockouts
        });
    } catch (error) {
        console.error('Error fetching stockouts:', error);
        res.status(500).json({ message: 'Failed to fetch stockouts', success: false });
    }
};



export const updateStockout = async (req, res) => {
    try {
        const { id } = req.params;
        const { vendorId,inventoryId, totalStock,others,invoiceId, centerId ,appointmentId,appointmentType,hospitalId} = req.body;

        // Build updated data
        const updatedData = {
            ...(vendorId && { vendorId }),
            ...(inventoryId && { inventoryId }),
             totalStock,
             others ,
             invoiceId,
            ...(centerId && { centerId }),
            appointmentId,
            appointmentType,hospitalId
        };

        const stockout = await Stockout.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
        if (!stockout) {
            return res.status(404).json({ message: 'stockout not found', success: false });
        }
        const inventory = await Inventory.findOne({_id:inventoryId}).select("ignoreStockLevel stockLevel inventoryName") ;
        const stockin = await Stockin.findOne({inventoryId}).select("totalStock vendorId");
        if(!inventory.ignoreStockLevel){
            if((parseFloat(stockin.totalStock) - parseFloat(totalStock) ) < parseFloat(inventory.stockLevel)){
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
                                                title: `Please Maintain Stock Level For Inventory`,
                                                body: ` ${inventory.inventoryName}`,
                                                 type: "Stock Level",
                                                 date: new Date(),
                                                 inventoryId: inventory._id,
                                                 isView:false,
                                                 link:"/stock-in"
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
            }
        }
        res.status(200).json({ stockout, success: true });
    } catch (error) {
        console.error('Error updating stockout:', error);
        res.status(400).json({ message: 'Failed to update stockout', success: false });
    }
};

export const searchStockouts = async (req, res) => {
    try {
        const { id: vendorId } = req.params;
        const { search,centerId } = req.query;
        if (!search) {
            return res.status(400).json({ message: 'Search query is required', success: false });
        }

        const regex = new RegExp(search, 'i'); // Case-insensitive search

        const stockouts = await Stockout.find({vendorId,centerId});

        if (!stockouts) {
            return res.status(404).json({ message: 'No stockouts found', success: false });
        }

        const inventories = await Inventory.find(
            {
            $or: [
                { inventoryType: regex },
                { inventoryName: regex },
                { brandName: regex },
                { stockLevel: regex },
                { unit: regex },
                { instrumentType: regex },
                
            ]
        }
    );

        if (!inventories) {
            return res.status(404).json({ message: 'No inventories found', success: false });
        }

        // Create a Map for fast inventory lookups
        const inventoryMap = new Map(inventories.map(inv => [inv._id.toString(), inv]));

        // Attach inventory details to stockins
        const stockoutsWithInventory = stockouts.map(stockout => ({
            ...stockout.toObject(),
            inventory: inventoryMap.get(stockout.inventoryId.toString()) || null
        }));

        return res.status(200).json({
            stockouts: stockoutsWithInventory.filter(inventory => inventory.inventory && inventory.totalStock > 0),
            success: true,
            pagination: {
                currentPage: 1,
                totalPages: Math.ceil(stockouts.length / 12),
                totalStockouts: stockouts.length,
            },
        });
    } catch (error) {
        console.error('Error searching stockouts:', error);
        res.status(500).json({ message: 'Failed to search stockouts', success: false });
    }
};

export const getStockoutsExcel = async (req, res) => {
  try {
    const { centerId, vendorId, inventoryId, startDate, endDate } = req.query;

    const filter = {};

    if (centerId) {
      filter.centerId = centerId;
    }
    if (vendorId) {
      filter.vendorId = vendorId;
    }
    if (inventoryId) {
      filter.inventoryId = inventoryId;
    }

    // Date range filter for createdAt
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else if (startDate) {
      filter.createdAt = { $gte: new Date(startDate) };
    } else if (endDate) {
      filter.createdAt = { $lte: new Date(endDate) };
    }

    const stockouts = await Stockout.find(filter).populate('vendorId').populate('inventoryId').populate('hospitalId').populate('appointmentId'); // Populate vendor and inventory names

    if (!stockouts || stockouts.length === 0) {
      return res.status(404).json({ message: 'No stockouts found matching the criteria', success: false });
    }

    // Prepare data for Excel export
    const excelData = stockouts.map(stockout => ({
      'Vendor Name': stockout.vendorId ? stockout.vendorId.vendorName : 'N/A',
      'Inventory Name': stockout.inventoryId ? stockout.inventoryId.inventoryName : 'N/A',
      'Hospital Name': stockout.hospitalId ? stockout.hospitalId.hospitalName : 'N/A',
      'Appointment Type': stockout.appointmentType,
      'Patient Name': stockout.appointmentId ? stockout.appointmentId.title : 'N/A',
      'Total Stock': stockout.totalStock,
      'Others': JSON.stringify(stockout.others), // Stringify 'others' object for clarity
      'Created At': stockout.createdAt.toISOString(),
    }));

    // Note: Directly generating an Excel file (.xlsx) requires a library like ExcelJS.
    // Since the original code used ExcelJS for doctors, we'll assume it's available.
    // If not, this part would need adjustment to return JSON data.
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Stockins');

    worksheet.columns = [
      { header: 'Vendor Name', key: 'Vendor Name', width: 25 },
      { header: 'Inventory Name', key: 'Inventory Name', width: 25 },
      { header: 'Hospital Name', key: 'Hospital Name', width: 25 },
      { header: 'Appointment Type', key: 'Appointment Type', width: 25 },
      { header: 'Patient Name', key: 'Patient Name', width: 25 },
      { header: 'Total Stock', key: 'Total Stock', width: 15 },
      { header: 'Others', key: 'Others', width: 40 },
      { header: 'Created At', key: 'Created At', width: 25 },
    ];

    excelData.forEach(data => {
      worksheet.addRow(data);
    });

    // Set response headers for Excel download
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    let filename = 'stockouts';
    if (startDate) filename += `_from_${startDate}`;
    if (endDate) filename += `_to_${endDate}`;
    filename += '.xlsx';

    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${filename}`
    );

    // Write the Excel file to the response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exporting stockins to Excel:', error);
    res.status(500).json({ message: 'Failed to export stockins', success: false });
  }
};