const { ApiError } = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse"); // Adjust the path if needed

const { User } = require("../Models/User.js");
const { Events } = require("../Models/Events.js");
const { generateUser } = require("./username.js");
const bcrypt = require("bcryptjs");
const { generateToken } = require("../authentication/UserAuth.js");

// [ABH_ID, fullName, email, phoneNumber, dob, password, institution]
const registerUser = async (req, res) => {
  try {
    const {
      fullName,
      email,
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
      email,
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

    return res
      .status(201)
      .json(new ApiResponse(201, user, "User registered successfully"));
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

    const isProd = process.env.NODE_ENV === "production";

    res.cookie("user", token, {
      httpOnly: true,
      secure: isProd,                 // true on Render/HTTPS
      sameSite: isProd ? "none" : "lax", // none required for cross-site
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json(new ApiResponse(200, user, "Login successful"));
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

    res.status(200).json({
      user: req.user,
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch user",
    });
  }
};

const logoutUser = (req, res) => {
  res.clearCookie("user", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    path: "/",
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
  getCurrentUser,
  logoutUser
  
};
