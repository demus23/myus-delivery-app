// scripts/forceNonUniqueSuiteIndex.js
require("dotenv").config({ path: ".env.local" });
const { MongoClient } = require("mongodb");

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing");
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  console.log("DB NAME:", db.databaseName);

  const col = db.collection("packages");
  const indexes = await col.indexes();
  const suite = indexes.find(i => i.name === "suiteId_1");
  if (suite) {
    console.log("Found suiteId_1:", suite);
    if (suite.unique) {
      console.log("Dropping UNIQUE suiteId_1…");
      await col.dropIndex("suiteId_1");
      console.log("Recreating NON-unique suiteId_1…");
      await col.createIndex({ suiteId: 1 }, { name: "suiteId_1" });
      console.log("✅ Recreated as non-unique.");
    } else {
      console.log("✅ Already non-unique, nothing to do.");
    }
  } else {
    console.log("suiteId_1 not found, creating non-unique…");
    await col.createIndex({ suiteId: 1 }, { name: "suiteId_1" });
    console.log("✅ Created non-unique suiteId_1.");
  }

  console.log("Final indexes:", await col.indexes());
  await client.close();
})();
