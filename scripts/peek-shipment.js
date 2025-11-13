// scripts/peek-shipment.js
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ MONGODB_URI not found in .env.local');
  process.exit(1);
}

const ShipmentSchema = new mongoose.Schema(
  {
    trackingNumber: String,
    providerShipmentId: String,
    status: String,
    activity: Array,
  },
  { collection: 'shipments', timestamps: true }
);
const Shipment = mongoose.model('Shipment', ShipmentSchema);

(async () => {
  await mongoose.connect(uri);
  const doc = await Shipment.findOne(
    { trackingNumber: 'TEST123456' },
    { trackingNumber: 1, providerShipmentId: 1, status: 1, updatedAt: 1 }
  ).lean();
  console.log(doc || 'NOT FOUND');
  await mongoose.disconnect();
})();
