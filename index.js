import express, { urlencoded } from "express";
import connectDB from "./db/connection.js";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import bodyParser from "body-parser";
import routes from "./routes/index.js";

dotenv.config();
// connect db
connectDB();
const PORT = process.env.PORT || 8080;
const app = express();


// middleware
app.use(express.json({ limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));  // Example for a 50MB limit
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(urlencoded({extended:true}));
app.use(cookieParser());
app.use(cors({
    origin: "*", // Specify the frontend's origin
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization", "x-auth-token"],
    credentials: true, // Allow credentials if needed
  }));
  
  // Explicitly handle OPTIONS method for preflight
  app.options("*", cors()); // Allow preflight requests

// api's route
app.use("/api/v1/auth", routes.authRoute);
app.use("/api/v1/doctors", routes.doctorRoute);
app.use("/api/v1/hospitals", routes.hospitalRoute);
app.use("/api/v1/vendors",routes.vendorRoute);
app.use("/api/v1/states",routes.stateRoute);
app.use("/api/v1/cities",routes.cityRoute);
app.use("/api/v1/centers",routes.centerRoute);
app.use("/api/v1/patients",routes.patientRoute);
app.use("/api/v1/inventories",routes.inventoryRoute);
app.use("/api/v1/appointments",routes.appointmentRoute);
app.use("/api/v1/quicknotes",routes.quicknoteRoute);
app.use("/api/v1/stockins",routes.stockinRoute);
app.use("/api/v1/reports",routes.reportRoute);
app.use("/api/v1/procedures",routes.procedureRoute);
app.use("/api/v1/invoices",routes.invoiceRoute);
app.use("/api/v1/activities",routes.activityRoute);
app.use("/api/v1/activityTypes",routes.activityTypeRoute);
app.use("/api/v1/stockouts",routes.stockoutRoute);

app.listen(PORT, () => {
    console.log(`server running at port ${PORT}`);
});
