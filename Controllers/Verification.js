const dns = require("dns");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const VerificationOtp = require("../Models/VerificationOtp");
const { User } = require("../Models/User");

const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES || 10);
const OTP_RESEND_COOLDOWN_SECONDS = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);

const ipv4Lookup = (hostname, options, callback) => {
  return dns.lookup(hostname, { family: 4, all: false }, callback);
};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: String(process.env.SMTP_PASS || "").trim(),
  },
  connectionTimeout: 20000,
  greetingTimeout: 20000,
  socketTimeout: 20000,
});

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const sendSignupOtp = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "Email is required" });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(409).json({ message: "Email already registered" });

    const now = new Date();
    const existingOtp = await VerificationOtp.findOne({ email });

    if (existingOtp?.resendAfter && existingOtp.resendAfter > now) {
      const retryAfter = Math.ceil((existingOtp.resendAfter.getTime() - now.getTime()) / 1000);
      return res.status(429).json({ message: "Please wait before requesting OTP again", retryAfter });
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    await VerificationOtp.findOneAndUpdate(
      { email },
      {
        otpHash,
        expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
        resendAfter: new Date(Date.now() + OTP_RESEND_COOLDOWN_SECONDS * 1000),
        attempts: 0,
      },
      { upsert: true, new: true }
    );

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: "Abhyudaya Signup OTP",
      html: `<p>Your OTP is <b>${otp}</b>. It is valid for ${OTP_TTL_MINUTES} minutes.</p>`,
    });

    return res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("sendSignupOtp error:", error);
    return res.status(500).json({ message: "Failed to send OTP" });
  }
};

const verifySignupOtp = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const otp = String(req.body.otp || "").trim();

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const record = await VerificationOtp.findOne({ email });
    if (!record) return res.status(400).json({ message: "OTP not found" });

    if (record.expiresAt < new Date()) {
      await VerificationOtp.deleteOne({ email });
      return res.status(400).json({ message: "OTP expired" });
    }

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ message: "Max OTP attempts exceeded. Request new OTP." });
    }

    const isValid = await bcrypt.compare(otp, record.otpHash);
    if (!isValid) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({
        message: "Invalid OTP",
        attemptsLeft: Math.max(0, OTP_MAX_ATTEMPTS - record.attempts),
      });
    }

    await VerificationOtp.deleteOne({ email });

    const signupToken = jwt.sign(
      { email, purpose: "signup_verify" },
      process.env.SIGNUP_OTP_SECRET,
      { expiresIn: "15m" }
    );

    return res.status(200).json({ message: "OTP verified", signupToken });
  } catch (error) {
    console.error("verifySignupOtp error:", error);
    return res.status(500).json({ message: "Failed to verify OTP" });
  }
};

module.exports = {
  sendSignupOtp,
  verifySignupOtp,
};