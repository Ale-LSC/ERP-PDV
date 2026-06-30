import { randomUUID } from 'node:crypto';

export function generateProductSku(
  productName: string,
  entropy: string = randomUUID(),
): string {
  const normalizedName = productName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
  const prefix = normalizedName
    ? normalizedName.slice(0, 5).padEnd(3, 'X')
    : 'PRD';
  const suffix = entropy.replace(/-/g, '').toUpperCase().slice(0, 8);

  return `${prefix}-${suffix}`;
}
