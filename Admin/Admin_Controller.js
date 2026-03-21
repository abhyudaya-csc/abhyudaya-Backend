const { Admin_model } = require("./Admin_Model");
const { ApiError } = require("../utils/ApiError");
const { Send } = require("./EmailForLogin");

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toStringValue = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const AdminAuth = async (req, res) => {
  try {
    const fullName = toStringValue(req.body.fullName ?? req.body.name);
    const phoneNumber = toNumber(req.body.phoneNumber ?? req.body.phone);
    const year = toNumber(req.body.year);
    const rollNumber = toNumber(req.body.rollNumber ?? req.body.rollNo);

    if (!fullName || phoneNumber === null || year === null || rollNumber === null) {
      return res
        .status(400)
        .json(new ApiError(400, "fullName, phoneNumber, year and rollNumber are required"));
    }

    // Normalize payload so downstream handlers (Send) receive canonical keys.
    req.body.fullName = fullName;
    req.body.phoneNumber = phoneNumber;
    req.body.year = year;
    req.body.rollNumber = rollNumber;

    // check if admin exists (only after validated phoneNumber)
    let admin = await Admin_model.findOne({ phoneNumber });

    if (!admin) {
      // register admin
      admin = await Admin_model.create({
        fullName,
        phoneNumber,
        year,
        rollNumber,
      });

      console.log(`New admin registered - ${phoneNumber}`);
    } else {
      // Keep admin record fresh when signup/login payload has latest details.
      admin.fullName = fullName;
      admin.year = year;
      admin.rollNumber = rollNumber;
      await admin.save();

      console.log(`Admin login detected - ${phoneNumber}`);
    }

    // Send OTP and return response from Send()
    return Send(req, res);
  } catch (error) {
    console.log(error);

    return res
      .status(500)
      .json(new ApiError(500, "Something went wrong"));
  }
};

module.exports = { AdminAuth };
