// scripts/ensureExtraIndexes.js
require("dotenv").config({ path: ".env.local" });
const { MongoClient } = require("mongodb");
(async () => {
  const cli = new MongoClient(process.env.MONGODB_URI);
  await cli.connect();
  const db = cli.db();
  await db.collection("packages").createIndex({ tracking:1 });
  await db.collection("tracking_events").createIndex({ trackingNo:1, createdAt:-1 });
  await db.collection("tracking_events").createIndex({ packageId:1, createdAt:-1 });
  console.log("✅ extra indexes ensured");
  await cli.close();
})();
