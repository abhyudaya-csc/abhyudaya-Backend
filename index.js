const dotenv = require("dotenv");
dotenv.config();

const cors = require("cors");
const cookieParser = require("cookie-parser");
const Connection = require("./Connection");
const express = require("express");
const { attachUserWithTokenVerification } = require("./authentication/UserAuth");
const eventRouter = require("./Routers/Events");
const userRouter = require("./Routers/User");
const VerificationRouter = require("./Routers/Verification");
const adminRouter = require("./Routers/Admin");
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const app = express();

const allowedOrigins = [
  process.env.TEST,
  "http://localhost:5173",
  "https://abhyudaya.vercel.app",
  "https://abhyudaya-git-vmt-test-branch-abhyudaya-cscs-projects.vercel.app",
  "https://www.abhyudaya.site",
  
];

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

app.set("trust proxy", 1);
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(attachUserWithTokenVerification);

// Ping request testing
app.get("/", (req, res) => {
  return res.send({ error: `Server started at ${process.env.PORT}` });
});

// All Routers
app.use("/events", eventRouter);
app.use("/users", userRouter);
app.use("/verify", VerificationRouter);
app.use("/admin", adminRouter);

const startServer = async () => {
  try {
    await Connection();
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`✅ Server Running at Port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
