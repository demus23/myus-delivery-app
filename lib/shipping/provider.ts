// lib/shipping/provider.ts

// Local types (no ./types import needed)
export type Address = {
  name?: string;
  line1: string;
  line2?: string;
  city: string;
  postalCode?: string;
  country: string;
  phone?: string;
  email?: string;
};

export type Parcel = { length: number; width: number; height: number; weight: number };
export type Rate = { objectId: string; carrier: string; service: string; amount: number; currency: string; etaDays?: number };
export type CreateArgs = { to: Address; from: Address; parcel: Parcel; currency?: string; orderId?: string; customerEmail?: string };
export type CreateResult = { providerShipmentId: string; rates: Rate[] };

export type BuyLabelArgs = { providerShipmentId: string; rateObjectId: string };
export type BuyLabelResult = {
  labelUrl: string;
  trackingNumber: string;
  carrier?: string;
  service?: string;
  rateObjectId?: string;
};

const PROVIDER = (process.env.CARRIER_PROVIDER || "mock").toLowerCase();

/* ---------------------------------- MOCK ---------------------------------- */
async function mock_createShipmentAndRates({ parcel, currency = "AED" }: CreateArgs): Promise<CreateResult> {
  const id = `mock_shp_${Math.random().toString(36).slice(2, 10)}`;
  const base = 3500 + Math.round((parcel?.weight || 0) / 100);
  return {
    providerShipmentId: id,
    rates: [
      { objectId: `${id}_rate_1`, carrier: "MockExpress", service: "PRIORITY", amount: base, currency, etaDays: 2 },
      { objectId: `${id}_rate_2`, carrier: "MockPost",    service: "ECONOMY",  amount: base - 700, currency, etaDays: 5 },
    ],
  };
}
async function mock_buyLabel({ rateObjectId }: BuyLabelArgs): Promise<BuyLabelResult> {
  return {
    labelUrl: `https://example.com/labels/${rateObjectId}.pdf`,
    trackingNumber: `MOCK${Math.floor(100000000 + Math.random() * 899999999)}`,
    carrier: rateObjectId.includes("_rate_1") ? "MockExpress" : "MockPost",
    service: rateObjectId.includes("_rate_1") ? "PRIORITY" : "ECONOMY",
    rateObjectId,
  };
}

/* -------------------------------- EASYPOST -------------------------------- */
async function ep_createShipmentAndRates({ to, from, parcel, currency = "AED" }: CreateArgs): Promise<CreateResult> {
  const EasyPost = (await import("@easypost/api")).default;
  const api = new EasyPost(process.env.EASYPOST_API_KEY as string);

  const shipment = await api.Shipment.create({
    to_address:   { name: to.name,   street1: to.line1,   street2: to.line2,   city: to.city,   zip: to.postalCode,   country: to.country,   phone: to.phone,   email: to.email },
    from_address: { name: from.name, street1: from.line1, street2: from.line2, city: from.city, zip: from.postalCode, country: from.country, phone: from.phone, email: from.email },
    parcel:       { length: parcel.length, width: parcel.width, height: parcel.height, weight: parcel.weight },
    options: { currency },
  });

  const rates: Rate[] = (shipment.rates || []).map((r: any) => ({
    objectId: r.id,
    carrier: r.carrier,
    service: r.service,
    amount: Math.round(parseFloat(r.rate) * 100),
    currency: r.currency || currency,
    etaDays: r.delivery_days || undefined,
  }));

  return { providerShipmentId: shipment.id, rates };
}

async function ep_buyLabel({ providerShipmentId, rateObjectId }: BuyLabelArgs): Promise<BuyLabelResult> {
  const EasyPost = (await import("@easypost/api")).default;
  const api = new EasyPost(process.env.EASYPOST_API_KEY as string);

  const shipment: any = await api.Shipment.retrieve(providerShipmentId);
  const bought = await shipment.buy({ rate: { id: rateObjectId } });

  const labelUrl = bought.postage_label?.label_url || bought.label_url;
  const tracking = bought.tracking_code;

  const sel =
    (bought.selected_rate && bought.selected_rate.service) ? bought.selected_rate :
    (bought.rates || []).find((r: any) => r.id === rateObjectId);

  return {
    labelUrl,
    trackingNumber: tracking,
    carrier: sel?.carrier,
    service: sel?.service,
    rateObjectId,
  };
}

/* --------------------------------- SHIPPO --------------------------------- */
// Shippo typings are awkward: treat factory as any to avoid “no call signatures”.
async function sp_createShipmentAndRates({ to, from, parcel, currency = "AED", orderId }: CreateArgs): Promise<CreateResult> {
  // Use require-style factory; cast to any to quiet TS.
  const shippoFactory: any = (await import("shippo") as any).default || (await import("shippo") as any);
  const shippo: any = typeof shippoFactory === "function"
    ? shippoFactory(process.env.SHIPPO_API_KEY as string)
    : (shippoFactory as any)(process.env.SHIPPO_API_KEY as string);

  const address_to = await shippo.address.create({
    name: to.name, street1: to.line1, street2: to.line2, city: to.city, zip: to.postalCode, country: to.country, phone: to.phone, email: to.email, validate: true,
  });
  const address_from = await shippo.address.create({
    name: from.name, street1: from.line1, street2: from.line2, city: from.city, zip: from.postalCode, country: from.country, phone: from.phone, email: from.email, validate: true,
  });

  const shipment = await shippo.shipment.create({
    address_from, address_to,
    parcels: [{ length: parcel.length, width: parcel.width, height: parcel.height, distance_unit: "cm", weight: parcel.weight, mass_unit: "g" }],
    async: process.env.SHIPPO_ASYNC === "true" ? true : false,
    extra: { reference_1: orderId },
  });

  const rates: Rate[] = (shipment.rates || []).map((r: any) => ({
    objectId: r.object_id,
    carrier: r.provider || r.carrier,
    service: r.servicelevel?.name || r.servicelevel?.token || r.servicelevel_name,
    amount: Math.round(parseFloat(r.amount) * 100),
    currency: r.currency || currency,
    etaDays: r.estimated_days || undefined,
  }));

  return { providerShipmentId: shipment.object_id, rates };
}

async function sp_buyLabel({ rateObjectId }: BuyLabelArgs): Promise<BuyLabelResult> {
  const shippoFactory: any = (await import("shippo") as any).default || (await import("shippo") as any);
  const shippo: any = typeof shippoFactory === "function"
    ? shippoFactory(process.env.SHIPPO_API_KEY as string)
    : (shippoFactory as any)(process.env.SHIPPO_API_KEY as string);

  const tx = await shippo.transaction.create({ rate: rateObjectId, label_file_type: "PDF", async: false });
  if (tx.status !== "SUCCESS") throw new Error(tx.messages?.[0]?.text || "Shippo purchase failed");

  return {
    labelUrl: tx.label_url,
    trackingNumber: tx.tracking_number,
    carrier: tx.carrier,
    service: tx.servicelevel?.name || tx.service,
    rateObjectId,
  };
}

/* ------------------------------ PUBLIC FACADE ----------------------------- */
export async function createShipmentAndRates(args: CreateArgs): Promise<CreateResult> {
  if (PROVIDER === "easypost") return ep_createShipmentAndRates(args);
  if (PROVIDER === "shippo")   return sp_createShipmentAndRates(args);
  return mock_createShipmentAndRates(args);
}

export async function buyLabel(args: BuyLabelArgs): Promise<BuyLabelResult> {
  if (PROVIDER === "easypost") return ep_buyLabel(args);
  if (PROVIDER === "shippo")   return sp_buyLabel(args);
  return mock_buyLabel(args);
}
