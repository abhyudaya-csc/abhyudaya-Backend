const { Admin_model } = require("./Admin_Model");
const { generateToken } = require("../authentication/UserAuth");
const { ApiError } = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { Send } = require("./EmailForLogin");

const AdminAuth = async (req, res) => {
  try {

    const { fullName, phoneNumber, year, rollNumber } = req.body;

    if (
      ![fullName, phoneNumber, year, rollNumber].every((field) =>
        typeof field === "string" ? field.trim() : field
      )
    ) {
      return res
        .status(400)
        .json(new ApiError(400, "All fields are required"));
    }

    // check if admin exists
    let admin = await Admin_model.findOne({
      phoneNumber
    });

    if (!admin) {

      // register admin
      admin = await Admin_model.create({
        fullName,
        phoneNumber,
        year,
        rollNumber,
      });

      console.log("New admin registered");

    } else {

      console.log("Admin login detected");

    }

    // Send OTP
    await Send(req, res);

  } catch (error) {

    console.log(error);

    return res
      .status(500)
      .json(new ApiError(500, "Something went wrong"));

  }
};

module.exports = { AdminAuth };