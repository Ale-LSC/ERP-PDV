import { api } from "./api";
import type { Customer, Product } from "../types";

export async function loadCustomers(
  token: string,
  companyId: string,
  setCustomers: (items: Customer[]) => void,
  setError: (message: string) => void,
) {
  try {
    setCustomers(
      await api<Customer[]>(`/companies/${companyId}/customers`, {}, token),
    );
  } catch (reason) {
    setError(
      reason instanceof Error ? reason.message : "Erro ao carregar clientes.",
    );
  }
}

export async function loadProducts(
  token: string,
  companyId: string,
  setProducts: (items: Product[]) => void,
  setError: (message: string) => void,
) {
  try {
    setProducts(
      await api<Product[]>(`/companies/${companyId}/products`, {}, token),
    );
  } catch (reason) {
    setError(
      reason instanceof Error ? reason.message : "Erro ao carregar produtos.",
    );
  }
}
