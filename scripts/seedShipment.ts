import { config } from "dotenv";
// Load .env.local BEFORE touching any other modules
config({ path: ".env.local" });

async function main() {
  // Dynamic imports ensure env vars are already loaded
  const { default: dbConnect } = await import("../lib/dbConnect");
  const { Shipment } = await import("../lib/models/Shipment");

  await dbConnect();

  const doc = await Shipment.findOneAndUpdate(
    { trackingNumber: "TEST123456" },
    {
      $setOnInsert: {
        providerShipmentId: "MOCK-1",
        status: "pending",
        activity: [],
        createdAt: new Date(),
      },
      $set: { updatedAt: new Date() },
    },
    { upsert: true, new: true }
  );

  console.log("✅ Seeded shipment:", {
    id: String(doc._id),
    trackingNumber: doc.trackingNumber,
    providerShipmentId: doc.providerShipmentId,
    status: doc.status,
  });
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
