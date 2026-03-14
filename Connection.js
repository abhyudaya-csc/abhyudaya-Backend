const dotenv = require("dotenv");
const mongoose = require("mongoose");
dotenv.config();

const Connection = () => {
  mongoose.connect(process.env.MONGO_URL, {
  serverSelectionTimeoutMS: 5000
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.error("MongoDB connection error:", err));

};


module.exports = {Connection}