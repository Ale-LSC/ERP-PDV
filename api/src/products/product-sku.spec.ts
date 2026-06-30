import { generateProductSku } from './product-sku';

describe('generateProductSku', () => {
  it('creates a readable normalized SKU', () => {
    expect(generateProductSku('Café premium', 'abcdef12-rest')).toBe(
      'CAFEP-ABCDEF12',
    );
  });

  it('uses a generic prefix when the name has no alphanumeric characters', () => {
    expect(generateProductSku('---', '12345678-rest')).toBe('PRD-12345678');
  });
});
