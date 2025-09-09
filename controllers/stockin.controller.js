import { Stockin } from '../models/stockin.model.js'; // Update the path as per your project structure
import { Inventory } from '../models/inventory.model.js';
import mongoose from "mongoose";
import ExcelJS from 'exceljs';

// Add a new stockin
export const addStockin = async (req, res) => {
    try {
        const { vendorId,inventoryId, totalStock,others, centerId, userId } = req.body;

        // Validate required fields
        if (!vendorId || !inventoryId || !totalStock || !centerId ) {
            return res.status(400).json({ 
                message: 'Vendor Id,Inventory ID, Total Stock, Lot No. and Center ID are required', 
                success: false 
            });
        }

        // Create a new stockin
        const stockin = new Stockin({vendorId, inventoryId, totalStock,others, centerId, userId });

        await stockin.save();
        res.status(201).json({ stockin, success: true });
    } catch (error) {
        console.error('Error adding stockin:', error);
        res.status(500).json({ message: 'Failed to add stockin', success: false });
    }
};

// Get all stockins
export const getStockins = async (req, res) => {
    try {
        // Fetch stockins and inventories
        const { id } = req.params;
        const stockins = await Stockin.find({ centerId: id });
        if (!stockins) {
            return res.status(404).json({ message: 'No stockins found', success: false });
        }

        const inventories = await Inventory.find();
        if (!inventories) {
            return res.status(404).json({ message: 'No inventory items found', success: false });
        }

            // Create a Map for fast inventory lookups
            const inventoryMap = new Map(inventories.map(inv => [inv._id.toString(), inv]));

            // Categorize stockins based on inventory type
            const medicines = [];
            const instruments = [];
    
            stockins.forEach(stockin => {
                const inventory = inventoryMap.get(stockin.inventoryId.toString()) || null;
                const stockinWithInventory = {
                    ...stockin.toObject(),
                    inventory
                };
    
                if (inventory?.inventoryType === "Medicine") {
                    medicines.push(stockinWithInventory);
                } else if (inventory?.inventoryType === "Instrument") {
                    instruments.push(stockinWithInventory);
                }
            });
    
            // Reverse for latest first
            const reversedinventories = [...medicines].reverse();
            const reversedinstruments = [...instruments].reverse();
            const page = parseInt(req.query.page) || 1;

        // Define the number of items per page
        const limit = 12;

        // Calculate the start and end indices for pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        // Paginate the reversed movies array
        const paginatedinventories = reversedinventories.slice(startIndex, endIndex);
        const paginatedinstruments = reversedinstruments.slice(startIndex, endIndex);
        return res.status(200).json({ 
            medicines:paginatedinventories, 
            instruments:paginatedinstruments,
            success: true ,
            pagination: {
            currentPage: page,
            totalMedicinePages: Math.ceil(medicines.length / limit),
            totalInstrumentPages: Math.ceil(instruments.length / limit),
            totalmedicines: medicines.length,
            totalinstruments:instruments.length
        },});

    } catch (error) {
        console.error('Error fetching stockins:', error);
        res.status(500).json({ message: 'Failed to fetch stockins', success: false });
    }
};

export const getAllStockins = async (req, res) => {
    try {
        // Fetch stockins and inventories
        const { id } = req.params;
        const stockins = await Stockin.find({ centerId: id });
        if (!stockins) {
            return res.status(404).json({ message: 'No stockins found', success: false });
        }

        
        return res.status(200).json({ 
            stockins:stockins, 
            success: true ,});

    } catch (error) {
        console.error('Error fetching stockins:', error);
        res.status(500).json({ message: 'Failed to fetch stockins', success: false });
    }
};


// Get stockin by ID
export const getStockinById = async (req, res) => {
    try {
        const { id } = req.params;
        const stockin = await Stockin.findById(id);
        if (!stockin) {
            return res.status(404).json({ message: 'Stockin not found', success: false });
        }
        res.status(200).json({ stockin, success: true });
    } catch (error) {
        console.error('Error fetching stockin:', error);
        res.status(500).json({ message: 'Failed to fetch stockin', success: false });
    }
};

// Get stockins by Inventory ID
export const getStockinsByInventoryId = async (req, res) => {
    try {
        const { id } = req.params;
        const stockins = await Stockin.find({ inventoryId: id });
        if (!stockins) {
            return res.status(404).json({ message: 'Stockins not found', success: false });
        }
        res.status(200).json({ stockins, success: true });
    } catch (error) {
        console.error('Error fetching stockins:', error);
        res.status(500).json({ message: 'Failed to fetch stockins', success: false });
    }
};

// Update stockin by ID
export const updateStockin = async (req, res) => {
    try {
        const { id } = req.params;
        const { vendorId,inventoryId, totalStock,others, centerId, userId } = req.body;

        // Build updated data
        const updatedData = {
            ...(vendorId && { vendorId }),
            ...(inventoryId && { inventoryId }),
             totalStock,
             others ,
            ...(centerId && { centerId }),
            ...(userId && { userId }),
        };

        const stockin = await Stockin.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
        if (!stockin) {
            return res.status(404).json({ message: 'Stockin not found', success: false });
        }
        res.status(200).json({ stockin, success: true });
    } catch (error) {
        console.error('Error updating stockin:', error);
        res.status(400).json({ message: 'Failed to update stockin', success: false });
    }
};

// Delete stockin by ID
export const deleteStockin = async (req, res) => {
    try {
        const { id } = req.params;
        const stockin = await Stockin.findByIdAndDelete(id);
        if (!stockin) {
            return res.status(404).json({ message: 'Stockin not found', success: false });
        }
        res.status(200).json({ stockin, success: true });
    } catch (error) {
        console.error('Error deleting stockin:', error);
        res.status(500).json({ message: 'Failed to delete stockin', success: false });
    }
};


export const dashboardStockins = async (req, res) => {
    try {
        const { id } = req.params;
        const totalStockins = await Stockin.countDocuments({ centerId: id }); // Get total count

        const lastFiveStockins = await Stockin.find({ centerId: id }, { inventoryId: 1,totalStock:1, _id: 1 }) // Select only StockinName
            .sort({ createdAt: -1 }) // Sort by creation date (descending)
            .limit(5); // Get last 5 Stockins
            let inventoryIds = lastFiveStockins.map(stockin => stockin.inventoryId);

        // Convert inventoryIds to ObjectId (only if needed)
        inventoryIds = inventoryIds.map(id => new mongoose.Types.ObjectId(id));

        // Fetch inventory details where inventoryId matches
        const inventories = await Inventory.find(
            { _id: { $in: inventoryIds } }, // Using `_id` instead of `inventoryId`
            { inventoryName: 1 }
        );
    
            // Create a map of inventoryId to inventoryName
            const inventoryMap = inventories.reduce((map, inv) => {
                map[inv._id] = inv.inventoryName;
                return map;
            }, {});
    
            // Map stockins to include inventoryName
            const stockinsWithNames = lastFiveStockins.map(stockin => ({
                _id: stockin._id,
                inventoryId: stockin.inventoryId,
                inventoryName: inventoryMap[stockin.inventoryId] || "Unknown", // Fallback if not found
                totalStock: stockin.totalStock
            }));

        return res.status(200).json({ 
            totalStockins, 
            stockins: stockinsWithNames 
        });
    } catch (error) {
        console.error('Error fetching Stockins:', error);
        res.status(500).json({ message: 'Failed to fetch Stockins', success: false });
    }
};

export const searchStockins = async (req, res) => {
    try {
        const { id } = req.params;
        const { search } = req.query;
        if (!search) {
            return res.status(400).json({ message: 'Search query is required', success: false });
        }

        const regex = new RegExp(search, 'i'); // Case-insensitive search

        const stockins = await Stockin.find({centerId: id});
        if (!stockins) {
            return res.status(404).json({ message: 'No stockins found', success: false });
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
        const stockinsWithInventory = stockins.map(stockin => ({
            ...stockin.toObject(),
            inventory: inventoryMap.get(stockin.inventoryId.toString()) || null
        }));

        return res.status(200).json({
            stockins: stockinsWithInventory.filter(inventory => inventory.inventory),
            success: true,
            pagination: {
                currentPage: 1,
                totalPages: Math.ceil(stockins.length / 12),
                totalStockins: stockins.length,
            },
        });
    } catch (error) {
        console.error('Error searching stockins:', error);
        res.status(500).json({ message: 'Failed to search stockins', success: false });
    }
};

export const getExpiringStockins = async (req, res) => {
    try {
        const { id } = req.params;

        const stockins = await Stockin.find({ centerId: id });
        if (!stockins || stockins.length === 0) {
            return res.status(404).json({ message: 'No stockins found', success: false });
        }

        const inventoryIds = stockins.map(s => s.inventoryId);
        const inventories = await Inventory.find({ _id: { $in: inventoryIds } });
        const inventoryMap = new Map(inventories.map(inv => [inv._id.toString(), inv]));

        const today = new Date();
        const sixMonthsLater = new Date();
        sixMonthsLater.setMonth(today.getMonth() + 6);

        const expired = [];
        const expiringSoon = [];

        for (const stockin of stockins) {
            const inventory = inventoryMap.get(stockin.inventoryId.toString());
            if (!inventory) continue;

            let hasExpired = false;
            let hasExpiringSoon = false;

            for (const other of stockin.others || []) {
                const expiryStr = other.expiryDate;

                if (!expiryStr || expiryStr === "No Expiry") continue;

                const expiryDate = new Date(expiryStr);
                if (isNaN(expiryDate)) continue;

                if (expiryDate < today) {
                    hasExpired = true;
                } else if (expiryDate >= today && expiryDate <= sixMonthsLater) {
                    hasExpiringSoon = true;
                }
            }

            const fullStockin = {
                ...stockin.toObject(),
                inventory
            };

            if (hasExpired) expired.push(fullStockin);
            if (hasExpiringSoon) expiringSoon.push(fullStockin);
        }

        return res.status(200).json({
            expired,
            expiringSoon,
            success: true,
            count: {
                expired: expired.length,
                expiringSoon: expiringSoon.length
            }
        });

    } catch (error) {
        console.error('Error fetching expiring stockins:', error);
        res.status(500).json({ message: 'Failed to fetch expiring stockins', success: false });
    }
};


// Function to get stockins with filters and prepare for Excel export
export const getStockinsExcel = async (req, res) => {
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

    const stockins = await Stockin.find(filter).populate('vendorId').populate('inventoryId'); // Populate vendor and inventory names

    if (!stockins || stockins.length === 0) {
      return res.status(404).json({ message: 'No stockins found matching the criteria', success: false });
    }

    // Prepare data for Excel export
    const excelData = stockins.map(stockin => ({
      'Vendor Name': stockin.vendorId ? stockin.vendorId.vendorName : 'N/A',
      'Inventory Name': stockin.inventoryId ? stockin.inventoryId.inventoryName : 'N/A',
      'Total Stock': stockin.totalStock,
      'Others': JSON.stringify(stockin.others), // Stringify 'others' object for clarity
      'Created At': stockin.createdAt.toISOString(),
    }));

    // Note: Directly generating an Excel file (.xlsx) requires a library like ExcelJS.
    // Since the original code used ExcelJS for doctors, we'll assume it's available.
    // If not, this part would need adjustment to return JSON data.
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Stockins');

    worksheet.columns = [
      { header: 'Vendor Name', key: 'Vendor Name', width: 25 },
      { header: 'Inventory Name', key: 'Inventory Name', width: 25 },
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
    let filename = 'stockins';
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
