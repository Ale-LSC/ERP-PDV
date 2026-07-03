import { defaultModulesForSegment } from './company-modules';

describe('defaultModulesForSegment', () => {
  it.each(['market', 'industry', 'retail', 'services', 'other'] as const)(
    'enables the common administrative modules for %s',
    (segment) => {
      const modules = defaultModulesForSegment(segment);

      expect(modules).toEqual(
        expect.arrayContaining([
          'dashboard',
          'team',
          'customers',
          'products',
          'inventory',
          'finance',
          'reports',
        ]),
      );
      expect(new Set(modules).size).toBe(modules.length);
    },
  );

  it('enables checkout features only for market and retail companies', () => {
    expect(defaultModulesForSegment('market')).toEqual(
      expect.arrayContaining(['pdv', 'cash', 'expiry_control']),
    );
    expect(defaultModulesForSegment('retail')).toEqual(
      expect.arrayContaining(['pdv', 'cash']),
    );
    expect(defaultModulesForSegment('industry')).not.toContain('pdv');
    expect(defaultModulesForSegment('services')).not.toContain('pdv');
  });

  it('keeps specialized workflows isolated by segment', () => {
    expect(defaultModulesForSegment('industry')).toEqual(
      expect.arrayContaining(['production', 'bom', 'mrp', 'quality']),
    );
    expect(defaultModulesForSegment('services')).toEqual(
      expect.arrayContaining(['service_orders', 'appointments', 'contracts']),
    );
    expect(defaultModulesForSegment('other')).not.toEqual(
      expect.arrayContaining(['production', 'service_orders', 'pdv']),
    );
  });
});
