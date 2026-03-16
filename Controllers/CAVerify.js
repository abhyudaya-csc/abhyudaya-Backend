const { User } = require("../Models/User.js");

const getCampusAmbassadorRequests = async (req, res) => {
  try {
    const requests = await User.find({
      campusAmbassadorStatus: "pending",
    }).select("fullName email institution ABH_ID");

    res.status(200).json({
      requests,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch requests",
    });
  }
};

const approveCampusAmbassador = async (req, res) => {
  try {
    const { ABH_ID } = req.body;

    const user = await User.findOne({ ABH_ID });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Update ambassador status
    user.isCampusAmbassador = true;
    user.campusAmbassadorStatus = "approved";

    // Generate referral code automatically
    user.referallId = user.ABH_ID;

    await user.save();

    res.status(200).json({
      message: "Campus Ambassador approved",
      referallId: user.referallId,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Approval failed",
    });
  }
};

const rejectCampusAmbassador = async (req, res) => {
  try {
    const { ABH_ID } = req.body;

    const user = await User.findOne({ ABH_ID });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.campusAmbassadorStatus = "rejected";

    await user.save();

    res.status(200).json({
      message: "Request rejected",
    });
  } catch (error) {
    res.status(500).json({
      message: "Rejection failed",
    });
  }
};
const requestCampusAmbassador = async (req, res) => {
  try {
    const { fullName, email, institution } = req.body;
    const user = await User.findOne({ ABH_ID: req.user.ABH_ID });

    // const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.campusAmbassadorStatus === "pending") {
      return res.status(400).json({
        message: "Request already pending",
      });
    }

    if (user.isCampusAmbassador) {
      return res.status(400).json({
        message: "User is already a Campus Ambassador",
      });
    }

    user.campusAmbassadorStatus = "pending";

    await user.save();

    res.status(200).json({
      message: "Campus Ambassador request sent successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

const getAmbassadorReferrals = async (req, res) => {
  try {
    const { ABH_ID } = req.params;

    const ambassador = await User.findOne({ ABH_ID });

    if (!ambassador) {
      return res.status(404).json({
        message: "Ambassador not found",
      });
    }

    if (!ambassador.isCampusAmbassador) {
      return res.status(403).json({
        message: "User is not a Campus Ambassador",
      });
    }

    const referredUsers = await User.find({
      ABH_ID: { $in: ambassador.referrals },
    }).select("ABH_ID fullName email phoneNumber institution");

    res.status(200).json({
      totalReferrals: referredUsers.length,
      referrals: referredUsers,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Failed to fetch referrals",
    });
  }
};

const getAllAmbassadors = async (req, res) => {
  try {
    const ambassadors = await User.find({ isCampusAmbassador: true }).select(
      "ABH_ID fullName email phoneNumber institution referrals",
    );

    const formatted = ambassadors.map((user) => ({
      ABH_ID: user.ABH_ID,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      institution: user.institution,
      totalReferrals: user.referrals ? user.referrals.length : 0,
    }));

    res.status(200).json({
      totalAmbassadors: formatted.length,
      ambassadors: formatted,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Failed to fetch ambassadors",
    });
  }
};

const getAmbassadorLeaderboard = async (req, res) => {
  try {
    const ambassadors = await User.find({ isCampusAmbassador: true }).select(
      "ABH_ID fullName referrals institution",
    );

    const leaderboard = await User.aggregate([
      { $match: { isCampusAmbassador: true } },
      {
        $project: {
          ABH_ID: 1,
          fullName: 1,
          institution: 1,
          totalReferrals: { $size: { $ifNull: ["$referrals", []] } },
        },
      },
      { $sort: { totalReferrals: -1 } },
    ]);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Failed to generate leaderboard",
    });
  }
};

module.exports = {
  getCampusAmbassadorRequests,
  approveCampusAmbassador,
  rejectCampusAmbassador,
  getAmbassadorReferrals,
  getAllAmbassadors,
  getAmbassadorLeaderboard,
  requestCampusAmbassador,
};
