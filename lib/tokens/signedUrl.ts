// lib/tokens/signedUrl.ts
import crypto from "crypto";
const SECRET = process.env.INVOICE_LINK_SECRET || "dev-secret-change-me";

function b64u(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function b64uToBuf(s: string) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
}

type Payload = { invoiceNo: string; exp: number };

export function makeInvoiceToken(invoiceNo: string, ttlSeconds = 7 * 24 * 3600) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const body = b64u(JSON.stringify({ invoiceNo, exp } as Payload));
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest();
  return `${body}.${b64u(sig)}`;
}

export function verifyInvoiceToken(token: string, expectInvoiceNo: string): boolean {
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return false;
    const actualSig = crypto.createHmac("sha256", SECRET).update(body).digest();
    const givenSig = b64uToBuf(sig);
    if (actualSig.length !== givenSig.length) return false;
    if (!crypto.timingSafeEqual(actualSig, givenSig)) return false;
    const payload = JSON.parse(b64uToBuf(body).toString("utf8")) as Payload;
    if (payload.invoiceNo !== expectInvoiceNo) return false;
    if (payload.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}
