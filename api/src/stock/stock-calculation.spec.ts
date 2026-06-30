import { calculateStockQuantity } from './stock-calculation';
import { StockMovementType } from './stock.types';

describe('calculateStockQuantity', () => {
  it('adds incoming stock', () => {
    expect(calculateStockQuantity(10, StockMovementType.IN, 2.5)).toBe(12.5);
  });

  it('subtracts outgoing stock', () => {
    expect(calculateStockQuantity(10, StockMovementType.OUT, 3)).toBe(7);
  });

  it('sets the absolute quantity for an adjustment', () => {
    expect(calculateStockQuantity(10, StockMovementType.ADJUSTMENT, 4)).toBe(4);
  });
});
