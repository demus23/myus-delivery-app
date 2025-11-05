import FxRate, { type FxRateDoc } from '@/lib/models/FxRate';
import dbConnect from '@/lib/dbConnect';

type FxLike = Pick<FxRateDoc, "rates" | "fetchedAt">;
const FX_URL = 'https://api.exchangerate.host/latest';

export async function getFxRates(base = 'AED'): Promise<Record<string, number>> {
  await dbConnect();
  const freshMs = 24 * 60 * 60 * 1000;

  const existing = await FxRate.findOne({ base })
    .sort({ fetchedAt: -1 })
    .lean<FxRateDoc>()
    .exec();

  if (existing?.fetchedAt && Date.now() - new Date(existing.fetchedAt).getTime() < freshMs) {
    return existing.rates;
  }

  const res = await fetch(`${FX_URL}?base=${encodeURIComponent(base)}`);
  if (!res.ok) throw new Error('FX fetch failed');
  const data = await res.json();

  const updated = await FxRate.findOneAndUpdate(
    { base },
    { rates: data.rates as Record<string, number>, fetchedAt: new Date() },
    { upsert: true, new: true }
  ).lean<FxRateDoc>();

  return (updated?.rates || data.rates) as Record<string, number>;
}

export async function convertFromAED(
  amountAED: number,
  target: 'AED'|'USD'|'GBP'
) {
  if (target === 'AED') return { amount: amountAED, rate: 1 } as const;
  const rates = await getFxRates('AED');
  const rate = rates[target];
  if (!rate) throw new Error(`No FX rate for ${target}`);
  return { amount: amountAED * rate, rate } as const;
}
