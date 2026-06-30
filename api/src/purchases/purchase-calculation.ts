export function calculatePurchaseTotal(
  items: Array<{ quantity: number; unitCost: number }>,
) {
  return items.reduce(
    (total, item) => total + Math.round(item.quantity * item.unitCost * 100),
    0,
  );
}
