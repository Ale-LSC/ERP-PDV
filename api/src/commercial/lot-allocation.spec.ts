import { allocateLotsFefo } from './lot-allocation';

describe('allocateLotsFefo', () => {
  const lots = [
    { id: 'later', quantity: 5, expiresAt: '2026-12-01' },
    { id: 'first', quantity: 2, expiresAt: '2026-08-01' },
  ];
  it('consumes the first expiring lot first', () => {
    expect(allocateLotsFefo(lots, 4, '2026-07-01')).toEqual([
      { id: 'first', quantity: 2 },
      { id: 'later', quantity: 2 },
    ]);
  });
  it('ignores expired lots', () => {
    expect(() => allocateLotsFefo(lots, 6, '2026-09-01')).toThrow(
      'Lotes válidos insuficientes',
    );
  });
  it('rejects quantities above valid lot stock', () => {
    expect(() => allocateLotsFefo(lots, 8, '2026-07-01')).toThrow();
  });
});
