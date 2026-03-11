const { Router } = require("express");
const {
  createEvent,
  updateEvent,
  deleteEvent,
} = require("../Controllers/Events");
const { AdminAuth } = require("../Admin/Admin_Controller");
const {Send, Verify} = require('../Admin/EmailForLogin');
const { movePendingToPaid, getAllUserTransactions,FetchAllUsersEvents, removePendingTransaction } = require("../Controllers/EventHandling");
const { getCampusAmbassadorRequests, approveCampusAmbassador, rejectCampusAmbassador,getAllAmbassadors,getAmbassadorLeaderboard } = require("../Controllers/CAVerify");
const { checkAdmin } = require("../authentication/Middleware");

const adminRouter = Router();

// Events manipulation
adminRouter.post("/events", checkAdmin, createEvent);
adminRouter.put("/events/:id", updateEvent);
adminRouter.delete("/events/:id", deleteEvent);

// User login and all
adminRouter.post("/auth", AdminAuth);
adminRouter.post("/send-email",  Send);
adminRouter.post("/verify-email", Verify);
adminRouter.get("/users-events",  FetchAllUsersEvents);


//Payment Handlings and all

adminRouter.post("/payment",  movePendingToPaid);
adminRouter.post("/pay-delete",  removePendingTransaction);
adminRouter.get("/transactions",  getAllUserTransactions);
// 

//Sponsors Upload.
//

//  CA
adminRouter.get("/ca-requests", checkAdmin, getCampusAmbassadorRequests);
adminRouter.post("/approve-ca", checkAdmin, approveCampusAmbassador);
adminRouter.post("/reject-ca", checkAdmin, rejectCampusAmbassador);
adminRouter.get("/requestCampusAmbassador", checkAdmin, getAllAmbassadors);
adminRouter.get("/ambassador", checkAdmin, getAllAmbassadors);
adminRouter.get("/ambassador/leaderborad", checkAdmin, getAmbassadorLeaderboard);

//

module.exports = adminRouter;
