import { nextBillingDate } from './contract-billing';

describe('nextBillingDate', () => {
  it('keeps the billing day when possible', () => {
    expect(nextBillingDate('2026-01-15', 'monthly')).toBe('2026-02-15');
  });
  it('uses the last valid day of a shorter month', () => {
    expect(nextBillingDate('2026-01-31', 'monthly')).toBe('2026-02-28');
  });
  it('supports quarterly and annual cycles', () => {
    expect(nextBillingDate('2026-01-10', 'quarterly')).toBe('2026-04-10');
    expect(nextBillingDate('2026-01-10', 'annual')).toBe('2027-01-10');
  });
});
