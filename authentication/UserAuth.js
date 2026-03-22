const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

const getJwtSecret = () =>
  process.env.USERNAME_SECRET ||
  process.env.JWT_SECRET ||
  process.env.jwt_secret;

<<<<<<< HEAD
const getTokenFromRequest = (req) => {
  const cookieToken = req.cookies?.user;
  if (cookieToken) return cookieToken;

  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
=======
const getRequestToken = (req) => {
  const cookieToken = req.cookies?.user || req.cookies?.token;
  if (cookieToken) return cookieToken;

  const authHeader = req.headers?.authorization || "";
  const isBearer = authHeader.toLowerCase().startsWith("bearer ");
  if (isBearer) {
>>>>>>> 698410a13e03aeec148266f869e0db14c0b0950a
    return authHeader.slice(7).trim();
  }

  return null;
};

// Middleware for attaching user from token
const attachUserWithTokenVerification = async (req, res, next) => {
  try {
<<<<<<< HEAD
    const token = getTokenFromRequest(req);
=======
    const token = getRequestToken(req);
>>>>>>> 698410a13e03aeec148266f869e0db14c0b0950a
    const jwtSecret = getJwtSecret();
    
    if (!token) return next(); // No token, proceed without modification

    if (!jwtSecret) return next();

    const decoded = jwt.verify(token, jwtSecret);

    if (decoded) {
      req.user = decoded;
    }
  } catch (error) {
    req.user = null;
<<<<<<< HEAD

    if (error.name === "TokenExpiredError") {
      // Do not block public routes like /users/login if an old cookie expired.
      res.clearCookie("user", {
        httpOnly: true,
        path: "/",
      });
    }
=======
>>>>>>> 698410a13e03aeec148266f869e0db14c0b0950a
  }

  next();
};

const generateToken = (user) => {
  const jwtSecret = getJwtSecret();

  if (!jwtSecret) {
    throw new Error(
      "JWT secret is missing. Set USERNAME_SECRET or JWT_SECRET or jwt_secret in environment variables."
    );
  }

  const payload = {
    fullName: user.fullName,
    ABH_ID: user.ABH_ID || null,
    phoneNumber: user.phoneNumber,
    email: user.email || null,
    profilePicture: user.profilePicture || null
  };

  return jwt.sign(payload, jwtSecret, {
    expiresIn: "7d", // Token valid for 7 days
  });
};

module.exports = { attachUserWithTokenVerification, generateToken };
