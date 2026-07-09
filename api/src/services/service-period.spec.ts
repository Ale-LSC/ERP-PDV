import { periodsOverlap, validatePeriod } from './service-period';

describe('service periods', () => {
  it('accepts adjacent appointments', () => {
    expect(
      periodsOverlap(
        new Date('2026-01-01T10:00:00Z'),
        new Date('2026-01-01T11:00:00Z'),
        new Date('2026-01-01T11:00:00Z'),
        new Date('2026-01-01T12:00:00Z'),
      ),
    ).toBe(false);
  });
  it('detects schedule overlap', () => {
    expect(
      periodsOverlap(
        new Date('2026-01-01T10:00:00Z'),
        new Date('2026-01-01T12:00:00Z'),
        new Date('2026-01-01T11:00:00Z'),
        new Date('2026-01-01T13:00:00Z'),
      ),
    ).toBe(true);
  });
  it('rejects inverted periods', () => {
    expect(() =>
      validatePeriod(
        new Date('2026-01-01T12:00:00Z'),
        new Date('2026-01-01T11:00:00Z'),
      ),
    ).toThrow();
  });
});
