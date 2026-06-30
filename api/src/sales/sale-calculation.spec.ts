import {
  calculateChangeCents,
  calculateSaleTotals,
  centsToDecimal,
  toCents,
} from './sale-calculation';

describe('sale calculations', () => {
  it('calculates fractional quantities using integer cents', () => {
    expect(
      calculateSaleTotals([{ unitPrice: '10.90', quantity: 1.5 }], 1),
    ).toEqual({
      itemTotals: [1635],
      subtotalCents: 1635,
      discountCents: 100,
      totalCents: 1535,
    });
  });

  it('rejects a discount greater than the subtotal', () => {
    expect(() =>
      calculateSaleTotals([{ unitPrice: 10, quantity: 1 }], 11),
    ).toThrow('O desconto não pode superar o subtotal');
  });

  it('converts monetary values without floating point output', () => {
    expect(toCents('19.99')).toBe(1999);
    expect(centsToDecimal(1999)).toBe('19.99');
  });

  it('calculates cash change and rejects insufficient received value', () => {
    expect(calculateChangeCents(19.9, 20)).toBe(10);
    expect(() => calculateChangeCents(20, 19.9)).toThrow(
      'O valor recebido é menor que o pagamento',
    );
  });
});
