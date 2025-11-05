// scripts/createIndexes.js
require("dotenv").config({ path: ".env.local" });
const { MongoClient, ObjectId } = require("mongodb");

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("❌ MONGODB_URI is missing in .env.local");
  process.exit(1);
}

async function ensureIndex(collection, keys, options = {}) {
  const indexName = options.name;
  const existing = await collection.indexes();
  const found = existing.find((i) => i.name === indexName);

  if (found) {
    const sameKeys = JSON.stringify(found.key) === JSON.stringify(keys);
    const sameUnique = (found.unique || false) === (options.unique || false);
    const sameSparse = (found.sparse || false) === (options.sparse || false);

    if (sameKeys && sameUnique && sameSparse) {
      console.log(`✅ Index '${indexName}' already exists, skipping.`);
      return;
    }

    console.log(
      `⚠️ Index '${indexName}' exists but with different spec. Dropping...`
    );
    await collection.dropIndex(indexName);
  }

  await collection.createIndex(keys, options);
  console.log(`✅ Created index '${indexName}'`);
}

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("✅ Connected");

    const db = client.db();
    const packagesCol = db.collection("packages");
    const usersCol = db.collection("users");
    const shipmentsCol = db.collection("shipments");

    //
    // 0) clean null / empty suiteId (you already saw 4 of these)
    //
    const r1 = await packagesCol.updateMany(
      { suiteId: null },
      { $unset: { suiteId: "" } }
    );
    if (r1.modifiedCount) {
      console.log(`🧹 Removed suiteId:null from ${r1.modifiedCount} docs`);
    }

    const r2 = await packagesCol.updateMany(
      { suiteId: "" },
      { $unset: { suiteId: "" } }
    );
    if (r2.modifiedCount) {
      console.log(`🧹 Removed suiteId:"" from ${r2.modifiedCount} docs`);
    }

    //
    // 1) FIND REAL DUPLICATES (like your "UAE-E77ZD")
    //
    // group by suiteId, count>1
    const dupCursor = await packagesCol
      .aggregate([
        {
          $match: {
            suiteId: { $exists: true, $ne: null, $ne: "" },
          },
        },
        {
          $group: {
            _id: "$suiteId",
            count: { $sum: 1 },
            docs: { $push: { _id: "$_id" } },
          },
        },
        {
          $match: {
            count: { $gt: 1 },
          },
        },
      ])
      .toArray();

    if (dupCursor.length) {
      console.log(`⚠️ Found ${dupCursor.length} duplicate suiteId groups.`);
    }

    // 2) For every duplicate suiteId, keep one, unset the rest
    for (const group of dupCursor) {
      const suiteId = group._id;
      const docs = group.docs;

      // keep the first one
      const [keep, ...rest] = docs;
      console.log(`🟡 suiteId='${suiteId}' has ${docs.length} docs → keeping ${keep._id}, fixing ${rest.length}`);

      if (rest.length) {
        const restIds = rest.map((d) => d._id);
        const res = await packagesCol.updateMany(
          { _id: { $in: restIds } },
          { $unset: { suiteId: "" } }
        );
        console.log(
          `   ↳ unset suiteId from ${res.modifiedCount} duplicate docs for '${suiteId}'`
        );
      }
    }

    //
    // 3) NOW create the unique+sparse index
    //
    await ensureIndex(
      packagesCol,
      { suiteId: 1 },
      {
        name: "suiteId_1",
        unique: true,
        sparse: true,
      }
    );

    //
    // 4) other indexes (adjust to your app)
    //
    await ensureIndex(
      usersCol,
      { email: 1 },
      {
        name: "email_1",
        unique: true,
      }
    );

    await ensureIndex(
      shipmentsCol,
      { trackingNumber: 1 },
      {
        name: "trackingNumber_1",
        unique: true,
        sparse: true,
      }
    );

    console.log("🎉 All indexes ensured.");
  } catch (err) {
    console.error("❌ Error creating indexes:", err);
  } finally {
    await client.close();
  }
}

main();
