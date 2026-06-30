import { StockMovementType } from './stock.types';

export function calculateStockQuantity(
  currentQuantity: number,
  movementType: StockMovementType,
  movementQuantity: number,
): number {
  if (movementType === StockMovementType.ADJUSTMENT) {
    return movementQuantity;
  }

  if (movementType === StockMovementType.IN) {
    return currentQuantity + movementQuantity;
  }

  return currentQuantity - movementQuantity;
}
