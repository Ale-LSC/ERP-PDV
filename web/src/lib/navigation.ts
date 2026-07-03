import { hasModule } from "./company-modules";
import type { AppSection, CompanyModule } from "../types";

export function defaultSectionForRole(
  role?: string,
  modules?: CompanyModule[],
): AppSection {
  if (role === "cashier") {
    if (hasModule(modules, "pdv")) return "pdv";
    if (hasModule(modules, "customers")) return "customers";
  }
  if (role === "stock") {
    if (hasModule(modules, "inventory")) return "stock";
    if (hasModule(modules, "products")) return "products";
    if (hasModule(modules, "purchases")) return "purchases";
  }
  if (role === "finance" && hasModule(modules, "finance")) return "finance";
  return "dashboard";
}
