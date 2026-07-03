export function calculateMaterialRequirement(
  componentQuantity: number,
  bomYield: number,
  productionQuantity: number,
  available: number,
) {
  if (componentQuantity <= 0 || bomYield <= 0 || productionQuantity <= 0)
    throw new Error('Quantidades de produção devem ser positivas');
  const required = (componentQuantity * productionQuantity) / bomYield;
  return { required, shortage: Math.max(0, required - available) };
}
