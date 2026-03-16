//this file is used to push all the events to the db
//just run node seedEvent.js in terminal
const mongoose = require("mongoose");
const { Events } = require("./Models/Events"); // adjust path if needed
const eventsData = require("./events.json"); // your JSON file

const dotenv = require("dotenv"); 
dotenv.config();

const MONGO_URI = process.env.MONGO_URL;

const formatEvents = eventsData.map((event) => ({
  name: event.name,
  description: event.description,
  category:
    event.category === "Talent Show"
      ? "Other"
      : event.category === "other"
      ? "Other"
      : event.category,
  eventType: event.eventType,
  teamType:
    event.teamType === "All"
      ? "Solo/Team"
      : event.teamType === "team"
      ? "Team"
      : event.teamType,
  images: [event.link],
  eventId: event.eventId,
  noOfRounds: event.noOfRounds,
  prize: event.prizeMoney || 0,
  participationFee: event.participationFee || 0,
  rules: event.rules,
}));

async function seedEvents() {
  try {
    await mongoose.connect(MONGO_URI);

    console.log("✅ MongoDB Connected");

    await Events.deleteMany({});
    console.log("🧹 Old events removed");

    await Events.insertMany(formatEvents);

    console.log("🎉 All events inserted successfully");

    process.exit();
  } catch (error) {
    console.error("❌ Error inserting events:", error);
    process.exit(1);
  }
}

seedEvents();