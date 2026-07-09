export type AvailableLot = {
  id: string;
  quantity: number | string;
  expiresAt: string;
};

export function allocateLotsFefo(
  lots: AvailableLot[],
  requestedQuantity: number,
  today: string,
) {
  const validLots = lots
    .filter((lot) => lot.expiresAt >= today && Number(lot.quantity) > 0)
    .sort((first, second) => first.expiresAt.localeCompare(second.expiresAt));
  if (
    validLots.reduce((total, lot) => total + Number(lot.quantity), 0) <
    requestedQuantity
  ) {
    throw new Error('Lotes válidos insuficientes');
  }
  let remaining = requestedQuantity;
  return validLots.flatMap((lot) => {
    if (remaining <= 0) return [];
    const quantity = Math.min(remaining, Number(lot.quantity));
    remaining -= quantity;
    return [{ id: lot.id, quantity }];
  });
}
