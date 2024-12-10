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

app.listen(PORT, () => {
    console.log(`server running at port ${PORT}`);
});
