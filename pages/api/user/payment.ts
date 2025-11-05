// pages/api/user/payment.ts
// Alias shim so both routes are supported.
// /api/user/payment -> /api/user/payment-methods
export { default, config } from "./payment-methods";
