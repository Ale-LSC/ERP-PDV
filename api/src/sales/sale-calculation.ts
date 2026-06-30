export interface SaleCalculationItem {
  unitPrice: number | string;
  quantity: number;
}

export function toCents(value: number | string): number {
  return Math.round(Number(value) * 100);
}

export function calculateSaleTotals(
  items: SaleCalculationItem[],
  discount: number,
) {
  const itemTotals = items.map((item) =>
    Math.round(toCents(item.unitPrice) * item.quantity),
  );
  const subtotalCents = itemTotals.reduce((total, value) => total + value, 0);
  const discountCents = toCents(discount);

  if (discountCents > subtotalCents) {
    throw new Error('O desconto não pode superar o subtotal');
  }

  return {
    itemTotals,
    subtotalCents,
    discountCents,
    totalCents: subtotalCents - discountCents,
  };
}

export function centsToDecimal(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function calculateChangeCents(
  amount: number | string,
  received: number | string,
): number {
  const change = toCents(received) - toCents(amount);
  if (change < 0) {
    throw new Error('O valor recebido é menor que o pagamento');
  }

  return change;
}
