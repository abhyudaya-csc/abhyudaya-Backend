const mongoose = require("mongoose");

const verificationOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    resendAfter: { type: Date, required: true },
  },
  { timestamps: true }
);

// Auto-delete expired OTP docs
verificationOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("VerificationOtp", verificationOtpSchema);