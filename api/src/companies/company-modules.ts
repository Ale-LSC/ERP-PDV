import type {
  CompanyModule,
  CompanySegment,
} from '../database/schema/companies.schema';

const commonModules = [
  'dashboard',
  'team',
  'customers',
  'products',
  'inventory',
  'purchases',
  'finance',
  'reports',
] as const satisfies readonly CompanyModule[];

export const segmentModuleDefaults = {
  market: [
    ...commonModules,
    'pdv',
    'cash',
    'promotions',
    'fiscal',
    'expiry_control',
  ],
  industry: [...commonModules, 'production', 'bom', 'mrp', 'quality', 'fiscal'],
  retail: [...commonModules, 'pdv', 'cash', 'promotions', 'fiscal'],
  services: [
    'dashboard',
    'team',
    'customers',
    'finance',
    'reports',
    'service_orders',
    'appointments',
    'contracts',
    'products',
    'inventory',
  ],
  other: commonModules,
} as const satisfies Record<CompanySegment, readonly CompanyModule[]>;

export function defaultModulesForSegment(segment: CompanySegment) {
  return [...segmentModuleDefaults[segment]];
}

const moduleDependencies: Partial<
  Record<CompanyModule, readonly CompanyModule[]>
> = {
  pdv: ['products', 'cash'],
  promotions: ['products', 'pdv'],
  expiry_control: ['products', 'inventory'],
  bom: ['products', 'inventory'],
  production: ['bom', 'inventory'],
  mrp: ['bom', 'inventory'],
  quality: ['production'],
  service_orders: ['customers', 'finance'],
  contracts: ['customers', 'finance'],
};

export function missingModuleDependencies(modules: readonly CompanyModule[]) {
  const enabled = new Set(modules);
  return modules.flatMap((module) =>
    (moduleDependencies[module] ?? [])
      .filter((dependency) => !enabled.has(dependency))
      .map((dependency) => ({ module, dependency })),
  );
}
