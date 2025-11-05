// scripts/inspectIndexes.js
require("dotenv").config({ path: ".env.local" });
const { MongoClient } = require("mongodb");

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing");
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(); // db from URI
  console.log("DB NAME:", db.databaseName);
  const idx = await db.collection("packages").indexes();
  console.log("packages indexes:", idx);
  await client.close();
})();
