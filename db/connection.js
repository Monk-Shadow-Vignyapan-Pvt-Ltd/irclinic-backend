import mongoose from "mongoose";
import { initializeDefaultStatuses } from "../controllers/status.controller.js";
import bcrypt from "bcryptjs"; // For hashing passwords
import { User } from "../models/user.model.js"; // Adjust path as needed
import {Center} from "../models/center.model.js";
import fs from 'fs';
// import archiver from 'archiver'; // Import archiver for zip compression

// Example: Your Mongoose model for the collection you want to query
// import { SubService } from "../models/sub_service.model.js";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('mongodb connected successfully');
        
        // Initialize default statuses (if required)
        await initializeDefaultStatuses();

        const defaultCenterCode = "SRT"

        const existingCenter = await Center.findOne({ centerCode: defaultCenterCode });

        if (!existingCenter) {
            const defaultCenter = new Center({
                _id: new mongoose.Types.ObjectId("67b982f1db70dcc4938cf9ce"), // Use the provided ObjectId
                accountPhoneNo: "919913535351",
                adminPhoneNo : "919913535351",
                centerAddress: "405,406 - 4th Floor Zenon Building, Opp Unique Hospital, Ring Rd, Surat, Gujarat-395001",
                centerCode: defaultCenterCode,
                centerEmail: "irclinic2018@gmail.com",
                centerName: "Surat Clinic",
                cityCode: "SU",
                stateCode: "GJ"
            });

            await defaultCenter.save();
            console.log("Default Center created successfully.");
        } else {
            console.log("Default Center already exists.");
        }


        const defaultAdminEmail = "admin@gmail.com";
        const defaultAdminPassword = "admin123"; // Plaintext password (for example)

        const existingUser = await User.findOne({ email: defaultAdminEmail });

        if (!existingUser) {
            // Hash the password
            const hashedPassword = await bcrypt.hash(defaultAdminPassword, 8);

            const defaultUser = new User({
                _id: new mongoose.Types.ObjectId("674053fefe934a5c26a74db3"), // Use the provided ObjectId
                email: defaultAdminEmail,
                password: hashedPassword, // Store hashed password
                username: "admin",
                role:"Super Admin",
                centerId: new mongoose.Types.ObjectId("67b982f1db70dcc4938cf9ce"),
                roles: [
                    { name: "Users", actions: { view: true, create: true, edit: true, delete: true } },
                    { name: "Doctors", actions: { view: true, create: true, edit: true, delete: true } },
                    { name: "Hospitals", actions: { view: true, create: true, edit: true, delete: true } },
                    { name: "Vendors", actions: { view: true, create: true, edit: true, delete: true } },
                    { name: "States&Cities", actions: { view: true, create: true, edit: true, delete: true } },
                    { name: "Centers", actions: { view: true, create: true, edit: true, delete: true } },
                    { name: "Patients", actions: { view: true, create: true, edit: true, delete: true } },
                    { name: "Inventories", actions: { view: true, create: true, edit: true, delete: true } },
                    { name: "StockIn", actions: { view: true, create: true, edit: true, delete: true } },
                    { name: "Reports", actions: { view: true, create: true, edit: true, delete: true } },
                    { name: "Procedures", actions: { view: true, create: true, edit: true, delete: true } },
                    { name: "Appointments", actions: { view: true, create: true, edit: true, delete: true } },
                    { name: "Activities", actions: { view: true, create: true, edit: true, delete: true } },
                    { name: "Invoices", actions: { view: true, create: true, edit: true, delete: true } },
                    { name: "Estimates", actions: { view: true, create: true, edit: true, delete: true } },
                    { name: "Queue", actions: { view: true, create: true, edit: true, delete: true } },
                ],
            });

            await defaultUser.save();
            console.log("Default admin user created successfully.");
        } else {
            console.log("Default admin user already exists.");
        }

        // const collections = await mongoose.connection.db.listCollections().toArray();
        // const allCollectionsData = {};

        // // Loop through each collection and fetch data
        // for (const collection of collections) {
        //     const collectionName = collection.name;
        //     const collectionData = await mongoose.connection.db.collection(collectionName).find().toArray();

        //     // Sanitize collection name and its data
        //     allCollectionsData[collectionName] = collectionData;
        // }

        // // Create a temporary JSON file
        // const filePath = './database_data.json';
        // const jsonData = JSON.stringify(allCollectionsData, null, 2);

        // // Write the raw JSON file (it will be compressed later)
        // fs.writeFileSync(filePath, jsonData);
        // console.log("JSON file generated successfully.");

        // // Now create a zip archive containing the JSON file
        // const zipFilePath = './database_data.zip'; // The destination zip file path
        // const output = fs.createWriteStream(zipFilePath);
        // const archive = archiver('zip', { zlib: { level: 9 } }); // level 9 for maximum compression

        // // Pipe archive data to the output file
        // archive.pipe(output);

        // // Append the JSON file to the ZIP archive
        // archive.file(filePath, { name: 'database_data.json' });

        // // Finalize the archive (this will start the compression process)
        // await archive.finalize();

        // console.log("ZIP file created successfully.");

        // // Clean up the temporary JSON file if you don't need it anymore
        // fs.unlinkSync(filePath);

        // // Return the path to the generated ZIP file
        // return zipFilePath;

    } catch (error) {
        console.log('Failed to connect or create zip file', error);
    }
}

export default connectDB;
