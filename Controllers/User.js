const { ApiError } = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse"); // Adjust the path if needed

const { User } = require("../Models/User.js");
const { Events } = require("../Models/Events.js");
const { generateUser } = require("./username.js");
const bcrypt = require("bcryptjs");
const { generateToken } = require("../authentication/UserAuth.js");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const toFrontendUser = (userDoc) => {
  const user = userDoc?.toObject ? userDoc.toObject() : userDoc;
  if (!user) return null;

  return {
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    institution: user.institution,
    ABH_ID: user.ABH_ID,
    paymentStatus: user.paymentStatus,
  };
};

const getAuthCookieOptions = () => {
  const isProductionLike =
    process.env.NODE_ENV === "production" || process.env.RENDER === "true";

  return {
    httpOnly: true,
    secure: isProductionLike,
    sameSite: isProductionLike ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };
};

const RESET_TOKEN_TTL_MINUTES = Number(process.env.RESET_PASSWORD_TTL_MINUTES || 20);

const createMailTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

const isStrongPassword = (password) => {
  if (typeof password !== "string") return false;
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password);
};

const getCookieOptions = (req, includeMaxAge = true) => {
  const isSecureRequest =
    req.secure || req.headers["x-forwarded-proto"] === "https";

  const options = {
    httpOnly: true,
    secure: isSecureRequest,
    sameSite: isSecureRequest ? "none" : "lax",
    path: "/",
  };

  if (includeMaxAge) {
    options.maxAge = 7 * 24 * 60 * 60 * 1000;
  }

  return options;
};

// [ABH_ID, fullName, email, phoneNumber, dob, password, institution]
const registerUser = async (req, res) => {
  try {
    const { email, signupToken } = req.body;

    if (!signupToken) {
      return res.status(400).json({ message: "OTP verification required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(signupToken, process.env.SIGNUP_OTP_SECRET);
    } catch (e) {
      return res.status(401).json({ message: "Invalid or expired signup verification token" });
    }

    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (decoded.purpose !== "signup_verify" || decoded.email !== normalizedEmail) {
      return res.status(401).json({ message: "OTP verification mismatch" });
    }

    const {
      fullName,
      phoneNumber,
      password,
      institution,
      course,
      gender,
      referallId,
    } = req.body;

    if (
      ![
        fullName,
        email,
        phoneNumber,
        password,
        institution
        
      ].every((field) => (typeof field === "string" ? field.trim() : field))
    ) {
      return res.status(400).json(new ApiError(400, "All fields are required"));
    }

    const userExist = await User.findOne({ $or: [{ email }, { phoneNumber }] });

    if (userExist) {
      return res.status(409).json(new ApiError(409, "User already exists"));
    }

    if (referallId) {
      const referallIdExist = await User.find({ ABH_ID: referallId });

      if (!referallIdExist) {
        return res
          .status(409)
          .json(new ApiError(404, "This Referall Id does not exist!"));
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      ABH_ID: await generateUser(fullName, phoneNumber),
      fullName,
      email: normalizedEmail,
      phoneNumber,

      password: hashedPassword,
      institution,
      course,
      gender,
      referallId,
    });
    if (referallId) {
      await User.findOneAndUpdate(
        { ABH_ID: referallId },
        { $push: { referrals: user.ABH_ID } },
      );
    }

    return res.status(201).json({
      user: toFrontendUser(user),
      message: "User registered successfully",
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new ApiError(500, "Something went wrong while registering"));
  }
};

const Login = async (req, res) => {
  try {
    const { email, ABH_ID, password } = req.body;

    if ((!email && !ABH_ID) || !password) {
      return res
        .status(400)
        .json(new ApiError(400, "Email/ABH_ID and Password are required"));
    }

    const user = await User.findOne(
      email
        ? { email: { $regex: `^${email}$`, $options: "i" } } // Case-insensitive
        : { ABH_ID },
    );

    console.log(user);

    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json(new ApiError(400, "Invalid credentials"));
    }

    const token = generateToken(user);

<<<<<<< HEAD
    res.cookie("user", token, getCookieOptions(req));

    return res.status(200).json(new ApiResponse(200, user, "Login successful"));
=======
    const cookieOptions = getAuthCookieOptions();

    // Set both keys for compatibility with frontend/client variants.
    res.cookie("user", token, cookieOptions);
    res.cookie("token", token, cookieOptions);

    return res.status(200).json({
      user: toFrontendUser(user),
      token,
      message: "Login successful",
    });
>>>>>>> 698410a13e03aeec148266f869e0db14c0b0950a
  } catch (error) {
    console.log(error);

    return res.status(500).json(new ApiError(500, "Something went wrong!"));
  }
};

// get All Users
// [eventsParticipated, ABH_ID, fullName, email, phoneNumber, institution]
// const getUsers = async (req, res) => {
//   try {
//     const startIndex = parseInt(req.query.startIndex) || 0;
//     const limit = parseInt(req.query.limit) || 9;
//     const order = req.query.order;
//     const sortDirection = order === "asc" ? 1 : -1;

//     let query = {
//       ...(req.body.fullName && { fullName: req.body.fullName }),
//       ...(req.body.ABH_ID && { ABH_ID: req.body.ABH_ID }),
//       ...(req.body.email && { email: req.body.email }),
//       ...(req.body.phoneNumber && { phoneNumber: req.body.phoneNumber }),
//       ...(req.body.eventsParticipated &&
//         req.body.eventsParticipated !== "All" && {
//           eventsParticipated: req.body.eventsParticipated,
//         }),
//       ...(req.body.institution && { institution: req.body.institution }),
//     };

//     let Users = await User.find(query)
//       .sort({ createdAt: sortDirection })
//       .skip(startIndex)
//       .limit(limit);

//     res.status(200).json({
//       Users,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };

const getUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select("ABH_ID fullName email phoneNumber institution")
      .sort({ createdAt: -1 });

    res.status(200).json({
      users,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Delete User
const deleteUser = async (req, res) => {
  try {
    const { email, ABH_ID } = req.body;

    if (!email && !ABH_ID) {
      return res
        .status(400)
        .json(
          new ApiError(400, "Email or ABH_ID is required to delete a user"),
        );
    }

    const removeUser = await User.findOneAndDelete({
      $or: [{ email }, { ABH_ID }],
    });

    if (!removeUser) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "User deleted successfully"));
  } catch (error) {
    console.log(error);
    return res.status(500).json(new ApiError(500, "Something went wrong!"));
  }
};

// Update User Details
const updateUser = async (req, res) => {
  try {
    const { email, ABH_ID, ...updateData } = req.body;

    if (!email && !ABH_ID) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "Email or ABH_ID is required to update user details",
          ),
        );
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json(new ApiError(400, "Update data is required"));
    }

    delete updateData.ABH_ID;
    delete updateData.phoneNumber;
    delete updateData.email;

    const user = await User.findOneAndUpdate(
      { $or: [{ email }, { ABH_ID }] },
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, user, "User information updated successfully"),
      );
  } catch (error) {
    return res.status(500).json(new ApiError(500, "Something went wrong!"));
  }
};
// for redux state management and cookies
const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findOne({
      $or: [{ email: req.user.email }, { ABH_ID: req.user.ABH_ID }],
    }).select("fullName email phoneNumber institution ABH_ID paymentStatus");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      user: toFrontendUser(user),
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch user",
    });
  }
};

const updateCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const allowedFields = ["fullName", "phoneNumber", "institution"];
    const incomingFields = Object.keys(req.body || {});

    if (incomingFields.length === 0) {
      return res.status(400).json({ message: "No fields provided for update" });
    }

    const disallowed = incomingFields.filter((field) => !allowedFields.includes(field));
    if (disallowed.length > 0) {
      return res.status(400).json({ message: "Only fullName, phoneNumber and institution can be updated" });
    }

    const updateData = {};

    if (Object.prototype.hasOwnProperty.call(req.body, "fullName")) {
      const fullName = String(req.body.fullName || "").trim();
      if (!fullName) {
        return res.status(400).json({ message: "fullName is required" });
      }
      updateData.fullName = fullName;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "institution")) {
      const institution = String(req.body.institution || "").trim();
      if (!institution) {
        return res.status(400).json({ message: "institution is required" });
      }
      updateData.institution = institution;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "phoneNumber")) {
      const phoneString = String(req.body.phoneNumber || "").trim();
      if (!/^\d{10}$/.test(phoneString)) {
        return res.status(400).json({ message: "phoneNumber must be 10 digits" });
      }
      updateData.phoneNumber = Number(phoneString);
    }

    const user = await User.findOneAndUpdate(
      { $or: [{ email: req.user.email }, { ABH_ID: req.user.ABH_ID }] },
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      },
    ).select("fullName email phoneNumber institution ABH_ID paymentStatus");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user: toFrontendUser(user) });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Phone number already in use" });
    }
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const forgotPassword = async (req, res) => {
  const genericResponse = {
    message: "If this email exists, reset instructions were sent.",
  };

  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json(genericResponse);
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.resetPasswordTokenHash = tokenHash;
    user.resetPasswordExpiresAt = new Date(
      Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000,
    );
    await user.save();

    const frontendBaseUrl =
      process.env.FRONTEND_URL || process.env.CLIENT_URL || process.env.APPLICATION_URL;

    if (frontendBaseUrl) {
      const resetLink = `${frontendBaseUrl.replace(/\/$/, "")}/reset-password?token=${rawToken}`;
      const transporter = createMailTransporter();

      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: "Reset your password",
        html: `<p>You requested a password reset.</p><p><a href=\"${resetLink}\">Reset Password</a></p><p>This link expires in ${RESET_TOKEN_TTL_MINUTES} minutes.</p>`,
      });
    }

    return res.status(200).json(genericResponse);
  } catch (error) {
    console.error("forgotPassword error:", error);
    return res.status(200).json(genericResponse);
  }
};

const resetPassword = async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    const newPassword = String(req.body?.newPassword || "");

    if (!token || !newPassword) {
      return res.status(400).json({ message: "token and newPassword are required" });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, number, and special character",
      });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordTokenHash = null;
    user.resetPasswordExpiresAt = null;
    await user.save();

    const cookieOptions = getAuthCookieOptions();
    res.clearCookie("user", {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      path: cookieOptions.path,
    });
    res.clearCookie("token", {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      path: cookieOptions.path,
    });

    return res.status(200).json({ message: "Password reset successful." });
  } catch (error) {
    console.error("resetPassword error:", error);
    return res.status(500).json({ message: "Failed to reset password" });
  }
};

const logoutUser = (req, res) => {
  const cookieOptions = getAuthCookieOptions();

  res.clearCookie("user", {
<<<<<<< HEAD
    ...getCookieOptions(req, false),
    path: "/",
=======
    httpOnly: cookieOptions.httpOnly,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    path: cookieOptions.path,
  });

  res.clearCookie("token", {
    httpOnly: cookieOptions.httpOnly,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    path: cookieOptions.path,
>>>>>>> 698410a13e03aeec148266f869e0db14c0b0950a
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

module.exports = {
  registerUser,
  Login,
  getUsers,
  deleteUser,
  updateUser,
  updateCurrentUser,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  logoutUser
  
};
