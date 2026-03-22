const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const { Resend } = require("resend");
const { Admin_model } = require("./Admin_Model");
const { generateToken } = require("../authentication/UserAuth");
const ApiResponse = require("../utils/ApiResponse");
dotenv.config();


const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// const otp = generateOTP();
let otps = {};

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const createTransporter = async () => {
  const smtpHost = process.env.SMTP_HOST || "smtp.resend.com";
  const smtpPort = Number(process.env.SMTP_PORT || 465);
  const smtpSecure = String(process.env.SMTP_SECURE || "true").toLowerCase() === "true";
  const smtpUser = process.env.SMTP_FROM;
  const smtpPass = String(process.env.SMTP_PASS).trim();

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 20000,
  });
};

//..............................Send Email.....................................
const Send = async (req, res) => {
  const phoneNumber = req.body.phoneNumber;
 
  const otp = generateOTP();
  const expirationTime = Date.now() + 10 * 60 * 1000; // 10 minutes from now

  otps[phoneNumber] = { otp, expirationTime };

  const mailUser =
    process.env.SMTP_FROM;
  const mailFrom =
    process.env.RESEND_FROM;

  if (!mailUser || !mailFrom) {
    return res.status(500).json({
      message: "Admin OTP mail configuration missing (mailUser/mailFrom)",
    });
  }

  const mailOptions = {
    from: mailFrom,
    to: mailUser,
    subject: "OTP Verification Email",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; text-align: center;">
        <div style="text-align: center; margin-bottom: 20px;">
          <a href="#"> <img src="https://i.postimg.cc/2SVKDZtL/Abhyudaya.png" alt="Abhyudaya" style="user-select: none; width: 150px; margin-bottom: 20px;"></a>
        </div>
        <h2 style="color: #333; margin-bottom: 20px;">OTP Verification Email</h2>
        <p style="color: #555; line-height: 1.5; margin-bottom: 20px;">
          Dear User,
        </p>
        <p style="color: #555; line-height: 1.5; margin-bottom: 20px;">
          Thank you for registering with AlphaLearn. To complete your registration, please use the following OTP (One-Time Password) to verify your account:
        </p>
        <p style="color: #333; font-size: 2.0em; font-weight: bold; margin-bottom: 20px;">
          ${otp}
        </p>
        <p style="color: #555; line-height: 1.5; margin-bottom: 20px;">
          This OTP is valid for 10 minutes. If you did not request this verification, please disregard this email. Once your account is verified, you will have access to our services and its features.
        </p>
        <p style="color: #555; line-height: 1.5; margin-bottom: 20px;">
          If you have any questions or need assistance, please feel free to reach out to us. We are here to help!
        </p>
      </div>
    `,
  };

  try {
    if (resend) {
      await resend.emails.send({
        from: mailFrom,
        to: mailUser,
        subject: mailOptions.subject,
        html: mailOptions.html,
      });
      return res.status(200).send("OTP sent successfully.");
    }

    const transporter = await createTransporter();
    await transporter.sendMail(mailOptions);
    res.status(200).send("OTP sent successfully.");
  } catch (error) {
    console.error("Admin OTP send failed:", error);
    res.status(502).json({
      message: "Failed to send OTP email",
      error: error.message,
    });
  }
};



// const Verify = (req, res) => {
    
//     const fullName = req.body.fullName;
//     const otp = req.body.otp;
//     const record = otps[fullName];
  
//     if (!record) {
//       return res.status(400).json({ message: "No OTP found for this email." });
//     }
  
//     const { otp: storedOtp, expirationTime } = record;
  
//     if (Date.now() > expirationTime) {
//       delete otps[fullName]; // Clean up expired OTP
//       return res.status(400).json({ message: "OTP has expired." });
//     }
  
//     if (storedOtp === otp) {
//       delete otps[fullName]; // Clean up used OTP
//       return res.status(200).json({ message: "OTP verified successfully." });
//     } else {
//       return res.status(400).json({ message: "Invalid OTP." });
//     }
//   };
  
//   module.exports = { Send, Verify };


const Verify = async (req, res) => {

  const { phoneNumber, otp } = req.body;

  const record = otps[phoneNumber];

  if (!record) {
    return res.status(400).json({ message: "No OTP found." });
  }

  const { otp: storedOtp, expirationTime } = record;
  console.log(storedOtp, otp, expirationTime, Date.now())
  if (Date.now() > expirationTime) {
    delete otps[phoneNumber];
    return res.status(400).json({ message: "OTP expired" });
  }

  if (storedOtp !== otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  delete otps[phoneNumber];

  const admin = await Admin_model.findOne({ phoneNumber });

  const token = generateToken(admin);

  res.cookie("user", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
  });
  console.log(token)
  return res
    .status(200)
    .json(new ApiResponse(200, { admin }, "Login successful"));
};

module.exports = { Verify,Send };
