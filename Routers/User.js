const { Router } = require("express");
const {
  deleteUser,
  registerUser,
  updateUser,
  updateCurrentUser,
  getUsers,
  Login,
  getCurrentUser,
  logoutUser,
} = require("../Controllers/User");
const { checkAdmin, checkUser } = require("../authentication/Middleware");
const { eventRegister, getAllUserTransactions } = require("../Controllers/EventHandling");

const userRouter = Router();

userRouter.post("/", registerUser);
userRouter.post("/login", Login);
userRouter.post("/logout", logoutUser);

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
