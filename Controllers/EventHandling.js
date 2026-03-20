const { ApiError } = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse"); // Adjust the path if needed

const { User } = require("../Models/User.js");
const { Events } = require("../Models/Events.js");
const { generateUser } = require("./username.js");
const bcrypt = require("bcryptjs");
const { generateToken } = require("../authentication/UserAuth.js");

const eventRegister = async (req, res) => {
  try {
    const { trxnId, events } = req.body;

    if (!req.user?.ABH_ID) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!trxnId || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    const normalizedEvents = events
      .map((event) => ({
        eventId: event?.eventId,
        name: event?.name || event?.eventName,
        price: Number(event?.price ?? event?.participationFee ?? 0),
      }))
      .filter((event) => event.eventId && event.name);

    if (normalizedEvents.length !== events.length) {
      return res
        .status(400)
        .json(new ApiError(400, "Each event must include eventId and name"));
    }

    // Extract event IDs
    const eventIds = events.map((event) => event.eventId);

    // Validate if all events exist
    const eventDocs = await Events.find({ eventId: { $in: eventIds } });

    if (eventDocs.length !== events.length) {
      return res.status(404).json(new ApiError(404, "Some events not found"));
    }

    // 🔹 Fetch the user first
    const user = await User.findOne({ ABH_ID: req.user.ABH_ID });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🔹 Step 8: Prevent duplicate transaction
    if (user.eventsPending.has(trxnId) || user.eventsPaid.has(trxnId)) {
      return res
        .status(400)
        .json(new ApiError(400, "Transaction already exists"));
    }

    // 🔹 Add events to pending
    // user.eventsPending.set(trxnId, events);
    // await user.save();
    await User.updateOne(
      { ABH_ID: req.user.ABH_ID },
      {
        $set: {
          [`eventsPending.${trxnId}`]: events,
        },
      },
    );

    return res
      .status(200)
      .json(
        new ApiResponse(200, { user }, "Events added to pending successfully"),
      );
  } catch (error) {
    console.error("eventRegister error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const movePendingToPaid = async (req, res) => {
  try {
    const { trxnId, ABH_ID } = req.body;

    if (!trxnId) {
      return res
        .status(400)
        .json(new ApiError(400, "Transaction ID is required"));
    }

    // ✅ Fetch the user's pending events for the given transaction ID
    const user = await User.findOne({ ABH_ID });

    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    // ✅ Retrieve the events from Map using `.get()`
    const eventsToMove = user.eventsPending.get(trxnId);

    if (!eventsToMove || eventsToMove.length === 0) {
      return res
        .status(404)
        .json(new ApiError(404, "No events found for this transaction"));
    }

    // // ✅ Move events from `eventsPending` to `eventsPaid`
    // user.eventsPending.delete(trxnId); // Remove from pending
    // user.eventsPaid.set(trxnId, eventsToMove); // Move to paid
    // await user.save(); // Save changes

    await User.updateOne(
      { ABH_ID },
      {
        $unset: { [`eventsPending.${trxnId}`]: "" },
        $set: { [`eventsPaid.${trxnId}`]: eventsToMove },
      }
    );

    return res
      .status(200)
      .json(
        new ApiResponse(200, { user }, "Events moved to paid successfully"),
      );
  } catch (error) {
    console.error("event Payment error!!!", error);
    return res.status(500).json(new ApiError(500, "Something went wrong!"));
  }
};

const removePendingTransaction = async (req, res) => {
  try {
    const { trxnId, ABH_ID } = req.body;

    if (!trxnId) {
      return res
        .status(400)
        .json(new ApiError(400, "Transaction ID is required"));
    }

    // ✅ Use `findOneAndUpdate` to remove transaction from `eventsPending`
    const user = await User.findOneAndUpdate(
      { ABH_ID, [`eventsPending.${trxnId}`]: { $exists: true } }, // Ensure the transaction exists
      { $unset: { [`eventsPending.${trxnId}`]: "" } }, // Remove the transaction
      { new: true }, // Return the updated user document
    );

    if (!user) {
      return res
        .status(404)
        .json(
          new ApiError(404, "User or transaction not found in pending state"),
        );
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { user },
          "Transaction removed from pending successfully",
        ),
      );
  } catch (error) {
    console.error(error);
    return res.status(500).json(new ApiError(500, "Something went wrong!"));
  }
};

const getAllUserTransactions = async (req, res) => {
  try {
    if (!req.user?.ABH_ID) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findOne({ ABH_ID: req.user.ABH_ID }).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // IMPORTANT: Map -> plain object for frontend
    const eventsPending =
      user.eventsPending instanceof Map
        ? Object.fromEntries(user.eventsPending)
        : (user.eventsPending || {});

    const eventsPaid =
      user.eventsPaid instanceof Map
        ? Object.fromEntries(user.eventsPaid)
        : (user.eventsPaid || {});

    return res.status(200).json({
      message: "Fetched user transactions",
      data: { eventsPending, eventsPaid },
    });
  } catch (error) {
    console.error("getAllUserTransactions error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const FetchEventsForUsers = async (req, res) => {
  try {
    const user = await User.findOne({ ABH_ID: req.user.ABH_ID }).lean();

    if (!user) {
      return res.status(404).json({
        statuscode: 404,
        status: false,
        message: "User not found",
      });
    }

    // Extract pending and paid events
    const eventsPending = user.eventsPending || {};
    const eventsPaid = user.eventsPaid || {};

    return res.status(200).json({
      statuscode: 200,
      status: true,
      message: "Events fetched successfully",
      eventsPending,
      eventsPaid,
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return res.status(500).json({
      statuscode: 500,
      status: false,
      message: "Internal Server Error",
    });
  }
};

const FetchAllUsersEvents = async (req, res) => {
  try {
    const users = await User.find(
      {},
      "ABH_ID fullName email phoneNumber eventsPending eventsPaid",
    ).lean();

    if (!users || users.length === 0) {
      return res.status(404).json({
        statuscode: 404,
        status: false,
        message: "No users found",
      });
    }

    return res.status(200).json({
      statuscode: 200,
      status: true,
      message: "Users and their events fetched successfully",
      users,
    });
  } catch (error) {
    console.error("Error fetching users and their events:", error);
    return res.status(500).json({
      statuscode: 500,
      status: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  eventRegister,
  FetchEventsForUsers,
  FetchAllUsersEvents,
  movePendingToPaid,
  removePendingTransaction,
  getAllUserTransactions,
};
