const fs = require("fs");
const path = require("path");
const { Connection } = require("../Connection");
const { Events } = require("../Models/Events");

const frontendEventsPath = path.resolve(
  __dirname,
  "/EventData.json"
);

const categoryFallback = "Other";
const allowedCategories = new Set([
  "Music",
  "Dance",
  "Dramatics",
  "Art",
  "Literature",
  "Other",
]);

const normalizeTeamType = (value) => {
  const raw = String(value || "").toLowerCase();
  if (raw === "solo" || raw === "individual") return "Solo";
  if (raw === "duo" || raw === "duet") return "Duo";
  return "Team";
};

const normalizeEventType = (value) => {
  const raw = String(value || "").toLowerCase();
  return raw === "online" ? "Online" : "Offline";
};

const normalizeCategory = (value) => {
  const raw = String(value || "").trim();
  const mapped = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  return allowedCategories.has(mapped) ? mapped : categoryFallback;
};

const normalizeRules = (rules) => {
  if (!Array.isArray(rules) || rules.length === 0) {
    return ["Rules will be shared by event coordinators."];
  }
  return rules.map((rule) => String(rule));
};

const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toEventDoc = (event) => ({
  eventId: String(event.eventId),
  eventName: String(event.name || event.eventName || "Untitled Event"),
  description: String(event.description || ""),
  category: normalizeCategory(event.category),
  eventType: normalizeEventType(event.eventType),
  teamType: normalizeTeamType(event.teamType),
  noOfRounds: toSafeNumber(event.noOfRounds, 1),
  participationFee: toSafeNumber(event.participationFee ?? event.price, 0),
  prize: toSafeNumber(event.prize ?? event.prizeMoney, 0),
  rules: normalizeRules(event.rules),
  images: event.link ? [String(event.link)] : [],
  registrationLink: event.registrationLink ? String(event.registrationLink) : undefined,
});

const seed = async () => {
  if (!fs.existsSync(frontendEventsPath)) {
    throw new Error(`Event file not found at ${frontendEventsPath}`);
  }

  const fileContent = fs.readFileSync(frontendEventsPath, "utf-8");
  const frontendEvents = JSON.parse(fileContent);

  if (!Array.isArray(frontendEvents) || frontendEvents.length === 0) {
    throw new Error("No events found in EventData.json");
  }

  await Connection();

  let insertedOrUpdated = 0;

  for (const event of frontendEvents) {
    const doc = toEventDoc(event);

    await Events.updateOne(
      { eventId: doc.eventId },
      { $set: doc },
      { upsert: true }
    );

    insertedOrUpdated += 1;
  }

  console.log(`Seed complete. Upserted ${insertedOrUpdated} events.`);
  process.exit(0);
};

seed().catch((error) => {
  console.error("Failed to seed events:", error.message);
  process.exit(1);
});
