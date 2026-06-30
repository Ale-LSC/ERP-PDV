import { calculatePurchaseTotal } from './purchase-calculation';

describe('calculatePurchaseTotal', () => {
  it('soma itens em centavos sem erro de ponto flutuante', () => {
    expect(
      calculatePurchaseTotal([
        { quantity: 3, unitCost: 0.1 },
        { quantity: 2.5, unitCost: 4.2 },
      ]),
    ).toBe(1080);
  });

  it('retorna zero para uma lista vazia', () => {
    expect(calculatePurchaseTotal([])).toBe(0);
  });
});
