import { calculateMaterialRequirement } from './production-calculation';

describe('calculateMaterialRequirement', () => {
  it('scales component consumption by BOM yield', () => {
    expect(calculateMaterialRequirement(3, 10, 25, 4)).toEqual({
      required: 7.5,
      shortage: 3.5,
    });
  });
  it('does not report negative shortages', () => {
    expect(calculateMaterialRequirement(2, 1, 3, 10).shortage).toBe(0);
  });
  it('rejects invalid quantities', () => {
    expect(() => calculateMaterialRequirement(1, 0, 1, 0)).toThrow();
  });
});
