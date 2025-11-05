export function chargeableKg(
  actualKg: number,
  dims?: { L?: number; W?: number; H?: number }
) {
  const volKg =
    dims?.L && dims?.W && dims?.H ? (dims.L * dims.W * dims.H) / 5000 : 0; // cm divisor 5000
  return Math.max(actualKg, volKg || 0);
}

export function insuranceAED(declared?: number) {
  if (!declared || declared <= 0) return 0;
  const calc = declared * 0.005; // 0.5%
  return Math.max(10, Math.round(calc * 100) / 100);
}
