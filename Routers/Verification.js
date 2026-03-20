const { Router } = require("express");
const { sendSignupOtp, verifySignupOtp } = require("../Controllers/Verification");

const VerificationRouter = Router();

VerificationRouter.post("/send-signup-otp", sendSignupOtp);
VerificationRouter.post("/confirm-signup-otp", verifySignupOtp);

module.exports = VerificationRouter;
