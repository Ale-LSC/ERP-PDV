export type Company = {
  id: string;
  name: string;
  role: string;
  segment: string;
  size: string;
  modules?: CompanyModule[];
};
export type CompanyModule =
  | "dashboard"
  | "team"
  | "customers"
  | "products"
  | "inventory"
  | "purchases"
  | "finance"
  | "pdv"
  | "cash"
  | "reports"
  | "promotions"
  | "fiscal"
  | "expiry_control"
  | "production"
  | "bom"
  | "mrp"
  | "quality"
  | "service_orders"
  | "appointments"
  | "contracts";
export type Branch = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  isHeadquarters: boolean;
};
export type Employee = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  branches: Array<{ id: string; name: string }>;
};
export type Product = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  salePrice: string;
  effectivePrice?: string;
  costPrice: string;
  stockQuantity: string;
  minimumStock: string;
};
export type StockMovement = {
  id: string;
  productId: string;
  type: "in" | "out" | "adjustment";
  quantity: string;
  previousQuantity: string;
  resultingQuantity: string;
  reason: string | null;
  createdAt: string;
};
export type ReplenishmentRequest = {
  id: string;
  productId: string;
  productName: string;
  quantity: string;
  note: string | null;
  status: "pending" | "fulfilled" | "cancelled";
  requestedByName: string;
  createdAt: string;
};
export type CashSession = {
  id: string;
  openingAmount: string;
  openedAt: string;
  status: "open" | "closed";
};
export type CartItem = { product: Product; quantity: number };
export type CashSummary = {
  salesCount: number;
  salesTotal: string;
  expectedCashAmount: string;
  payments: Record<"cash" | "pix" | "debit_card" | "credit_card", string>;
};
export type Sale = {
  id: string;
  status: "completed" | "cancelled";
  total: string;
  createdAt: string;
};
export type SaleReceipt = Sale & {
  subtotal: string;
  discount: string;
  customerName: string | null;
  items: Array<{
    id: string;
    productName: string;
    quantity: string;
    unitPrice: string;
    total: string;
  }>;
  payments: Array<{
    id: string;
    method: string;
    amount: string;
    receivedAmount: string | null;
    changeAmount: string;
  }>;
};
export type Customer = {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
};
export type ReportOverview = {
  sales: {
    count: number;
    revenue: string;
    averageTicket: string;
    discounts: string;
  };
  payments: Record<"cash" | "pix" | "debit_card" | "credit_card", string>;
  topProducts: Array<{
    productId: string;
    name: string;
    quantity: string;
    revenue: string;
  }>;
  inventory: {
    productsCount: number;
    lowStockCount: number;
    stockCost: string;
    stockRetail: string;
  };
  customersCount: number;
};
export type FinancialEntry = {
  id: string;
  type: "payable" | "receivable";
  description: string;
  category: string | null;
  amount: string;
  dueDate: string;
  status: "pending" | "paid";
  paidAt: string | null;
};
export type FinanceSummary = Record<
  "payable" | "receivable",
  { pending: string; paid: string; count: number }
>;
export type AppSection =
  | `module:${CompanyModule}`
  | "settings"
  | "dashboard"
  | "pdv"
  | "products"
  | "stock"
  | "customers"
  | "finance"
  | "purchases"
  | "team";
export type ModuleRecord = {
  id: string;
  module: CompanyModule;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  dueAt: string | null;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};
export type Supplier = {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
};
export type Purchase = {
  id: string;
  supplierName: string;
  status: "completed" | "cancelled";
  invoiceNumber: string | null;
  total: string;
  dueDate: string | null;
  createdAt: string;
};
