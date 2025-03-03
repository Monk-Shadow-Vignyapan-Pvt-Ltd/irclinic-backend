import doctorRoute from "./doctor.route.js"
import authRoute from "./auth.route.js";
import hospitalRoute from "./hospital.route.js"
import vendorRoute from "./vendor.route.js"
import stateRoute from "./state.route.js"
import cityRoute from "./city.route.js"
import centerRoute from "./center.route.js"
import patientRoute from "./patient.route.js"
import inventoryRoute from "./inventory.route.js"
import appointmentRoute from "./appointment.route.js"
import quicknoteRoute from "./quicknote.route.js"
import stockinRoute from "./stockin.route.js"
import reportRoute from "./report.route.js"
import procedureRoute from "./procedure.route.js";
import invoiceRoute from "./invoice.route.js";
import activityRoute from "./activity.route.js";
import activityTypeRoute from "./activityType.route.js";
import stockoutRoute from "./stockout.route.js";
import progressNoteRoute from "./progressNote.route.js";
import estimateRoute from "./estimate.route.js";
import statusRoute from "./status.route.js";
import consentRoute from "./consent.route.js";
import specialityRoute from "./speciality.route.js";
import nonStockInventoryRoute from "./nonstockinventory.route.js";
import firebaseTokenRoute from "./firebaseToken.route.js";

const routes = {
  doctorRoute,
  authRoute,
  hospitalRoute,
  vendorRoute,
  stateRoute,
  cityRoute,
  centerRoute,
  patientRoute,
  inventoryRoute,
  appointmentRoute,
  quicknoteRoute,
  stockinRoute,
  reportRoute,
  procedureRoute,
  invoiceRoute,
  activityRoute,
  activityTypeRoute,
  stockoutRoute,
  progressNoteRoute,
  estimateRoute,
  statusRoute,
  consentRoute,
  specialityRoute,
  nonStockInventoryRoute,
  firebaseTokenRoute
};

export default routes;