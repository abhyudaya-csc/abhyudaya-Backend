const { Router } = require("express");
const {
  deleteUser,
  registerUser,
  updateUser,
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

userRouter.get("/fetchEvents", checkUser, getAllUserTransactions);
userRouter.post("/eventRegister", checkUser, eventRegister);

module.exports = userRouter;
