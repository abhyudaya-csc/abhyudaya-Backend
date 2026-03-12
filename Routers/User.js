const { Router } = require("express");
const { deleteUser,  registerUser, updateUser, getUsers , Login, getCurrentUser, logoutUser} = require("../Controllers/User");
const {getAmbassadorReferrals, requestCampusAmbassador} = require("../Controllers/CAVerify");
const { eventRegister, FetchEventsForUsers } = require("../Controllers/EventHandling");
const { checkAdmin, checkUser } = require("../authentication/Middleware");

const userRouter=Router();


userRouter.post("/", registerUser);
userRouter.post("/login",  Login);
userRouter.post("/logout",  logoutUser);
userRouter.get("/all",   getUsers);
userRouter.delete("/", checkAdmin, deleteUser);
userRouter.put("/",checkUser,  updateUser);
userRouter.get("/fetchEvents", checkUser,  FetchEventsForUsers);
userRouter.post("/eventRegister", checkUser, eventRegister);
userRouter.post("/request-ca", checkUser, requestCampusAmbassador);
userRouter.get("/referrals/:ABH_ID", getAmbassadorReferrals);
userRouter.get("/me", checkUser, getCurrentUser);


module.exports =  userRouter; 
 