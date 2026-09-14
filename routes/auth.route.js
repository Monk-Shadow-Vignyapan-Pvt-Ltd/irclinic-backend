import express from "express";
import {auth} from "../middleware/auth.js"
import { addUser, login, tokenIsValid, getUser,getUsers,updateUser,updatePassword,updateUserPassword,deleteUser,updateDashboard,updateNotifications,searchUsers,getAllUsers,verifyTurnstile,getExotelCalls,getExotelRecording} from "../controllers/auth.controller.js";
import {initiateIciciPayment,checkIciciPaymentStatus,initiateAdPayment,checkAdPaymentStatus} from "../controllers/iciciPayment.controller.js";

const router = express.Router();

router.route("/addUser").post( addUser);
router.route("/login").post( login);
router.route("/tokenIsValid").post( tokenIsValid);
router.route("/getUser").get(auth, getUser);
router.route("/getUsers").get( getUsers);
router.route("/updateUser/:id").post( updateUser);
router.route("/updatePassword/:id").post( updatePassword);
router.route("/updateUserPassword/:id").post( updateUserPassword);
router.route("/deleteUser/:id").delete( deleteUser);
router.route("/updateDashboard/:id").post( updateDashboard);
router.route("/updateNotifications/:id").post( updateNotifications);
router.route("/searchUsers").post( searchUsers);
router.route("/getAllUsers").get( getAllUsers);
router.route("/verifyTurnstile").post( verifyTurnstile);
router.route("/getExotelCalls").get( getExotelCalls);
router.route("/getExotelRecording/:callSid").get( getExotelRecording);
router.route("/initiateIciciPayment").post( initiateIciciPayment);
router.route("/checkIciciPaymentStatus").post( checkIciciPaymentStatus);

router.post("/payment-callback", async (req, res) => {
  
  return res.redirect(
    `https://irclinicindia.com/thank-you-booking-appointment?txn=${req.query.txn}`
  );
});

router.route("/initiateAdPayment").post( initiateAdPayment);
router.route("/checkAdPaymentStatus").post( checkAdPaymentStatus);

router.post("/adpayment-callback", async (req, res) => {
  
  return res.redirect(
    `https://irclinicindia.com/thank-you-for-payment?txn=${req.query.txn}`
  );
});

export default router;
