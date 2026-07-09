export type BillingCycle = 'monthly' | 'quarterly' | 'annual';

export function nextBillingDate(date: string, cycle: BillingCycle) {
  const [year, month, day] = date.split('-').map(Number);
  const months = cycle === 'monthly' ? 1 : cycle === 'quarterly' ? 3 : 12;
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}
