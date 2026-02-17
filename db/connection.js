import mongoose from "mongoose";
import { initializeDefaultStatuses } from "../controllers/status.controller.js";
import bcrypt from "bcryptjs"; // For hashing passwords
import { User } from "../models/user.model.js"; // Adjust path as needed
import {Center} from "../models/center.model.js";
// import archiver from 'archiver'; // Import archiver for zip compression

// Example: Your Mongoose model for the collection you want to query
// import { SubService } from "../models/sub_service.model.js";

import fs from 'fs';
import archiver from 'archiver';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import path from 'path';
import cron from 'node-cron';
import { exec } from 'child_process';
import { dirname } from 'path';
import { google } from 'googleapis';

import dotenv from 'dotenv';
dotenv.config();

// MongoDB configurations
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_URI = process.env.MONGO_URI;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'monkshadow.dev@gmail.com',
    pass: 'xeyj cbsm ustp udbc',
  },
});

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, './service-account-key.json'),
  scopes: ['https://www.googleapis.com/auth/drive'],
});

const uploadToDrive = async (zipPath) => {
  const drive = google.drive({ version: 'v3', auth: await auth.getClient() });
  const fileName = `mongo-backup-${new Date().toISOString().slice(0,10)}.zip`;
  const folderId = process.env.GOOGLE_FOLDER_ID; // This should be a Shared Drive folder ID

  const response = await drive.files.create({
  requestBody: {
    name: fileName,
    parents: [folderId],
    mimeType: 'application/zip',
  },
  media: {
    mimeType: 'application/zip',
    body: fs.createReadStream(zipPath),
  },
  supportsAllDrives: true,
});
  const fileId = response.data.id;

  // Optional: Set public view permission (if needed)
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
    supportsAllDrives: true,
  });

  // Get file link
  const result = await drive.files.get({
    fileId,
    fields: 'webViewLink',
    supportsAllDrives: true,
  });

  return result.data.webViewLink;
};

const cleanupOldBackups = async () => {
  const drive = google.drive({ version: 'v3', auth: await auth.getClient() });
  const folderId = process.env.GOOGLE_FOLDER_ID;

  const res = await drive.files.list({
    q: `'${folderId}' in parents and name contains 'mongo-backup-' and trashed=false`,
    fields: 'files(id, name, createdTime)',
    orderBy: 'createdTime asc', // oldest first
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    corpora: 'allDrives',
  });

  const files = res.data.files || [];

  if (files.length <= 15) return;

  const filesToDelete = files.slice(0, files.length - 15);

  for (const file of filesToDelete) {
    await drive.files.delete({
      fileId: file.id,
      supportsAllDrives: true,
    });
    console.log(`🗑️ Deleted old backup: ${file.name}`);
  }
};



export const backupMongoDB = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '../../backups'); // Adjust path if necessary
    const dumpDir = path.join(backupDir, `dump-${timestamp}`);
    const zipPath = path.join(backupDir, `backup-${timestamp}.zip`);
    const dumpCommand = `mongodump --uri="${DB_URI}" --out="${dumpDir}"`;
  
    exec(dumpCommand, (error, stdout, stderr) => {
        if (error) {
            console.error('❌ Dump Error:', error.message);
        }
        if (stderr) {
           // console.error('❌ Dump STDERR:', stderr);
        }
        if (stdout) {
            console.log('✅ Dump STDOUT:', stdout);
        }
  
      console.log('✅ MongoDB dump successful.');
  
      // Create ZIP from dump folder
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
  
      output.on('close', async () => {
        console.log(`✅ ZIP created: ${zipPath} (${archive.pointer()} bytes)`);

        const link = await uploadToDrive(zipPath);

       // await cleanupOldBackups();

  
        // Send email with link instead of attachment
        const mailOptions = {
          from: 'monkshadow.dev@gmail.com',
          to: 'irclinic2018@gmail.com',
          subject: 'Daily Database Backup (Drive Link)',
          html: `
            <p>Hello,</p>
            <p>The daily MongoDB backup has been uploaded to Google Drive.</p>
            <p><strong>Backup Link:</strong> <a href="${link}">${link}</a></p>
            <p>Regards,<br/>IR Clinic Backup System</p>
          `,
        };
  
        transporter.sendMail(mailOptions, (emailErr, info) => {
          if (emailErr) {
            console.error('❌ Email Error:', emailErr);
          } else {
            console.log('📧 Backup email sent:', info.response);
          }
  
          // Cleanup ZIP & dump folder regardless of email success
          try {
            if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
            if (fs.existsSync(dumpDir)) fs.rmSync(dumpDir, { recursive: true, force: true });
            console.log('🧹 Cleaned up ZIP and dump folder.');
          } catch (cleanupErr) {
            console.error('❌ Cleanup error:', cleanupErr);
          }
        });
      });

      

  
      archive.on('error', err => {
        console.error('❌ Archiving error:', err);
      });
  
      archive.pipe(output);
      archive.directory(dumpDir, false);
      archive.finalize();
    });
  };
  

// Cron job to schedule backup every 7 days
cron.schedule('0 0 * * *', () => {
    backupMongoDB(); // Trigger backup every day at midnight
  });
//backupMongoDB();
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
        const defaultAdminPassword = "Admin##Monk##"; // Plaintext password (for example)

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
                    { name: "StockOut", actions: { view: true, create: true, edit: true, delete: true } },
                    { name: "Reports", actions: { view: true, create: true, edit: true, delete: true } },
                    { name: "Procedures", actions: { view: true, create: true, edit: true, delete: true } },
                    { name: "Appointments", actions: { view: true, create: true, edit: true, delete: true } },
                    { name: "Activities", actions: { view: true, create: true, edit: true, delete: true } },
                    { name: "Invoices", actions: { view: true, create: true, edit: true, delete: true } },
                    { name: "Estimates", actions: { view: true, create: true, edit: true, delete: true } },
                    { name: "Queue", actions: { view: true, create: true, edit: true, delete: true } },
                    { name: "Staff", actions: { view: true, create: true, edit: true, delete: true } },
                    { name: "ETO", actions: { view: true, create: true, edit: true, delete: true } },
                    { name: "Consignment", actions: { view: true, create: true, edit: true, delete: true } },
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
