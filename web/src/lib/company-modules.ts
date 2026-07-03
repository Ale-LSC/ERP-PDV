import type { CompanyModule } from "../types";

export const allCompanyModules: CompanyModule[] = [
  "dashboard",
  "team",
  "customers",
  "products",
  "inventory",
  "purchases",
  "finance",
  "pdv",
  "cash",
  "reports",
  "promotions",
  "fiscal",
  "expiry_control",
  "production",
  "bom",
  "mrp",
  "quality",
  "service_orders",
  "appointments",
  "contracts",
];

export const fallbackModules: CompanyModule[] = [
  "dashboard",
  "team",
  "customers",
  "products",
  "inventory",
  "purchases",
  "finance",
  "pdv",
  "cash",
  "reports",
];

export const moduleLabels: Record<CompanyModule, string> = {
  dashboard: "Painel",
  team: "Equipe",
  customers: "Clientes",
  products: "Produtos",
  inventory: "Estoque",
  purchases: "Compras",
  finance: "Financeiro",
  pdv: "PDV",
  cash: "Caixa",
  reports: "Relatórios",
  promotions: "Promoções",
  fiscal: "Fiscal",
  expiry_control: "Validades e lotes",
  production: "Produção",
  bom: "Ficha técnica",
  mrp: "MRP",
  quality: "Qualidade",
  service_orders: "Ordens de serviço",
  appointments: "Agenda",
  contracts: "Contratos",
};

export const segmentLabels: Record<string, string> = {
  market: "Mercado",
  industry: "Indústria",
  retail: "Comércio",
  services: "Serviços",
  other: "Operação geral",
};

export function enabledModules(modules?: CompanyModule[]) {
  return modules?.length ? modules : fallbackModules;
}

export function hasModule(
  modules: CompanyModule[] | undefined,
  module: CompanyModule,
) {
  return enabledModules(modules).includes(module);
}
