const { Router } = require("express");
const rateLimit = require("express-rate-limit");
const {
  deleteUser,
  registerUser,
  updateUser,
  updateCurrentUser,
  forgotPassword,
  resetPassword,
  getUsers,
  Login,
  getCurrentUser,
  logoutUser,
} = require("../Controllers/User");
const { checkAdmin, checkUser } = require("../authentication/Middleware");
const { eventRegister, getAllUserTransactions } = require("../Controllers/EventHandling");

const userRouter = Router();

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many forgot password requests. Please try again later." },
});

userRouter.post("/", registerUser);
userRouter.post("/login", Login);
userRouter.post("/logout", logoutUser);
userRouter.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
userRouter.post("/forgotPassword", forgotPasswordLimiter, forgotPassword);
userRouter.post("/reset-password", resetPassword);
userRouter.post("/resetPassword", resetPassword);

userRouter.get("/all", getUsers);
userRouter.delete("/", checkAdmin, deleteUser);
userRouter.put("/", checkUser, updateUser);
userRouter.get("/me", checkUser, getCurrentUser);
userRouter.patch("/me", checkUser, updateCurrentUser);
// Backward-compatible aliases while frontend consolidates to PATCH /users/me
userRouter.patch("/profile", checkUser, updateCurrentUser);
userRouter.patch("/update-profile", checkUser, updateCurrentUser);
userRouter.patch("/update", checkUser, updateCurrentUser);

userRouter.get("/fetchEvents", checkUser, getAllUserTransactions);
userRouter.post("/eventRegister", checkUser, eventRegister);

module.exports = userRouter;
