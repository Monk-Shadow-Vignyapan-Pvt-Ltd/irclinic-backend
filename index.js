import express, { urlencoded } from "express";
import { createServer } from "http"; // Import HTTP server
import { Server } from "socket.io"; // Import Socket.IO
import connectDB from "./db/connection.js";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import bodyParser from "body-parser";
import routes from "./routes/index.js";
import { startWhatsAppReminderCron } from "./controllers/appointment.controller.js";

dotenv.config();
// connect db
connectDB();

const PORT = process.env.PORT || 8080;
const app = express();
const server = createServer(app); // Create an HTTP server
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust according to your needs
    methods: ["GET", "POST"],
  },
});

// WebSocket connection
io.on("connection", (socket) => {
  //console.log("New client connected");

  socket.on("disconnect", () => {
    //  console.log("Client disconnected");
  });
});

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(bodyParser.json({ limit: "50mb" })); // Example for a 50MB limit
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "https://irclinic-dashboard.netlify.app",
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      "https://irclinicindia.com"
    ],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "x-auth-token",
    ],
    credentials: true, // Allow cookies and authentication headers
  })
);

// API Routes
app.use("/api/v1/auth", routes.authRoute);
app.use("/api/v1/adminDoctors", routes.adminDoctorRoute);
app.use("/api/v1/blogs", routes.blogRoute);
app.use("/api/v1/banners", routes.bannerRoute);
app.use("/api/v1/tags", routes.tagRoute);
app.use("/api/v1/contacts", routes.contactRoute);
app.use("/api/v1/newsletters", routes.newsletterRoute);
app.use("/api/v1/galleries", routes.gallaryRoute);
app.use("/api/v1/doctors", routes.doctorRoute);
app.use("/api/v1/hospitals", routes.hospitalRoute);
app.use("/api/v1/vendors", routes.vendorRoute);
app.use("/api/v1/states", routes.stateRoute);
app.use("/api/v1/cities", routes.cityRoute);
app.use("/api/v1/centers", routes.centerRoute);
app.use("/api/v1/patients", routes.patientRoute);
app.use("/api/v1/inventories", routes.inventoryRoute);
app.use("/api/v1/appointments", routes.appointmentRoute);
app.use("/api/v1/quicknotes", routes.quicknoteRoute);
app.use("/api/v1/stockins", routes.stockinRoute);
app.use("/api/v1/globals", routes.globalSearchRoute);
app.use("/api/v1/reports", routes.reportRoute);
app.use("/api/v1/procedures", routes.procedureRoute);
app.use("/api/v1/invoices", routes.invoiceRoute);
app.use("/api/v1/activities", routes.activityRoute);
app.use("/api/v1/activityTypes", routes.activityTypeRoute);
app.use("/api/v1/stockouts", routes.stockoutRoute);
app.use("/api/v1/progressNotes", routes.progressNoteRoute);
app.use("/api/v1/estimates", routes.estimateRoute);
app.use("/api/v1/statuses", routes.statusRoute);
app.use("/api/v1/consents", routes.consentRoute);
app.use("/api/v1/specialities", routes.specialityRoute);
app.use("/api/v1/nonStockInventories", routes.nonStockInventoryRoute);
app.use("/api/v1/firebaseTokens", routes.firebaseTokenRoute);
app.use("/api/v1/videoQueues", routes.videoQueueRoute);
app.use("/api/v1/prints", routes.printRoute);
app.use("/api/v1/services", routes.serviceRoute);
app.use("/api/v1/subServices", routes.subServiceRoute);
app.use("/api/v1/testimonials", routes.testimonialRoute);
app.use("/api/v1/faqs", routes.faqRoute);
app.use("/api/v1/categories", routes.categoryRoute);
app.use("/api/v1/diseases", routes.diseaseRoute);
app.use("/api/v1/areas", routes.areaRoute);
app.use("/api/v1/vendorInvoices", routes.vendorInvoiceRoute);
app.use("/api/v1/symptoms", routes.symptomRoute);
app.use("/api/v1/diagnoses", routes.diagnosisRoute);

startWhatsAppReminderCron();

// Start the server
server.listen(PORT, () => {
  console.log(`Server running at port ${PORT}`);
});

// Export io to use it in appointment controller
export { io };
