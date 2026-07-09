import { useEffect, useState } from "react";
import "./App.css";
import { AuthScreen } from "./features/auth/AuthScreen";
import { CreateCompany } from "./features/company/CreateCompany";
import { CompanyModules } from "./features/company/CompanyModules";
import { Customers } from "./features/customers/Customers";
import { Dashboard } from "./features/dashboard/Dashboard";
import { Finance } from "./features/finance/Finance";
import { Pdv } from "./features/pdv/Pdv";
import { Products } from "./features/products/Products";
import { Purchases } from "./features/purchases/Purchases";
import { Stock } from "./features/stock/Stock";
import { Team } from "./features/team/Team";
import { ModuleWorkspace } from "./features/modules/ModuleWorkspace";
import { Promotions } from "./features/commercial/Promotions";
import { ExpiryControl } from "./features/commercial/ExpiryControl";
import { Production } from "./features/production/Production";
import { Services } from "./features/services/Services";
import { api } from "./lib/api";
import { hasModule } from "./lib/company-modules";
import { loadCustomers, loadProducts } from "./lib/loaders";
import { defaultSectionForRole } from "./lib/navigation";
import type {
  AppSection,
  Branch,
  Company,
  CompanyModule,
  Customer,
  Product,
} from "./types";

const specializedModules: CompanyModule[] = [
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

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem("erp-token") ?? "",
  );
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [section, setSection] = useState<AppSection>("dashboard");
  const [error, setError] = useState("");
  const [pendingRequests, setPendingRequests] = useState(0);
  const selectedCompany = companies.find((item) => item.id === companyId);

  useEffect(() => {
    const start = () => setPendingRequests((current) => current + 1);
    const end = () => setPendingRequests((current) => Math.max(0, current - 1));
    const unauthorized = () => {
      setToken("");
      setCompanies([]);
      setCompanyId("");
      setError("Sua sessão expirou. Entre novamente.");
    };
    window.addEventListener("erp:request-start", start);
    window.addEventListener("erp:request-end", end);
    window.addEventListener("erp:unauthorized", unauthorized);
    return () => {
      window.removeEventListener("erp:request-start", start);
      window.removeEventListener("erp:request-end", end);
      window.removeEventListener("erp:unauthorized", unauthorized);
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    void api<Company[]>("/companies", {}, token)
      .then((items) => {
        setCompanies(items);
        setCompanyId((current) => current || items[0]?.id || "");
        setSection(defaultSectionForRole(items[0]?.role, items[0]?.modules));
      })
      .catch((reason: Error) => setError(reason.message));
  }, [token]);

  useEffect(() => {
    if (!token || !companyId) return;
    void api<Branch[]>(`/companies/${companyId}/branches`, {}, token)
      .then((items) => {
        const savedBranchId = localStorage.getItem("erp-branch");
        const selected =
          items.find((item: Branch) => item.id === savedBranchId) ??
          items.find((item: Branch) => item.isHeadquarters) ??
          items[0];
        setBranches(items);
        setBranchId(selected?.id ?? "");
        if (selected) localStorage.setItem("erp-branch", selected.id);
      })
      .catch((reason: Error) => setError(reason.message));
  }, [token, companyId]);

  useEffect(() => {
    if (!token || !companyId || !branchId) return;
    const modules = selectedCompany?.modules;
    if (hasModule(modules, "products")) {
      void loadProducts(token, companyId, setProducts, setError);
    } else {
      queueMicrotask(() => setProducts([]));
    }
    if (hasModule(modules, "customers")) {
      void loadCustomers(token, companyId, setCustomers, setError);
    } else {
      queueMicrotask(() => setCustomers([]));
    }
  }, [token, companyId, branchId, selectedCompany?.modules]);

  function authenticate(accessToken: string) {
    localStorage.setItem("erp-token", accessToken);
    setToken(accessToken);
    setError("");
  }

  function logout() {
    localStorage.removeItem("erp-token");
    setToken("");
    setCompanies([]);
    setCompanyId("");
    setProducts([]);
    setCustomers([]);
    setBranches([]);
    setBranchId("");
    localStorage.removeItem("erp-branch");
  }

  if (!token)
    return (
      <>
        {pendingRequests > 0 && <div className="global-loading" />}
        <AuthScreen onAuthenticated={authenticate} initialError={error} />
      </>
    );

  const company = selectedCompany;
  const role = company?.role ?? "cashier";
  const modules = company?.modules;
  const fullAccess = role === "owner" || role === "admin";
  const canUseDashboard = fullAccess && hasModule(modules, "dashboard");
  const canManageTeam = fullAccess && hasModule(modules, "team");
  const canUsePdv =
    (fullAccess || role === "cashier") && hasModule(modules, "pdv");
  const canUseProducts =
    (fullAccess || role === "stock") && hasModule(modules, "products");
  const canUseStock =
    (fullAccess || role === "stock") && hasModule(modules, "inventory");
  const canUseCustomers =
    (fullAccess || role === "cashier") && hasModule(modules, "customers");
  const canUsePurchases =
    (fullAccess || role === "stock") && hasModule(modules, "purchases");
  const canUseFinance =
    (fullAccess || role === "finance") && hasModule(modules, "finance");
  const lowStock = products.filter(
    (product) => Number(product.stockQuantity) <= Number(product.minimumStock),
  ).length;

  return (
    <div className="app-shell">
      {pendingRequests > 0 && <div className="global-loading" />}
      <aside className="sidebar">
        <div className="brand">
          <span>EP</span>
          <strong>ERP PDV</strong>
        </div>
        <nav>
          {fullAccess && (
            <button
              className={section === "settings" ? "active" : ""}
              onClick={() => setSection("settings")}
            >
              Configuração
            </button>
          )}
          {canUseDashboard && (
            <button
              className={section === "dashboard" ? "active" : ""}
              onClick={() => setSection("dashboard")}
            >
              Visão geral
            </button>
          )}
          {canManageTeam && (
            <button
              className={section === "team" ? "active" : ""}
              onClick={() => setSection("team")}
            >
              Funcionários
            </button>
          )}
          {canUsePdv && (
            <button
              className={section === "pdv" ? "active" : ""}
              onClick={() => setSection("pdv")}
            >
              PDV
            </button>
          )}
          {canUseProducts && (
            <button
              className={section === "products" ? "active" : ""}
              onClick={() => setSection("products")}
            >
              Produtos
            </button>
          )}
          {canUseStock && (
            <button
              className={section === "stock" ? "active" : ""}
              onClick={() => setSection("stock")}
            >
              Estoque
            </button>
          )}
          {canUseCustomers && (
            <button
              className={section === "customers" ? "active" : ""}
              onClick={() => setSection("customers")}
            >
              Clientes
            </button>
          )}
          {(canUsePurchases || canUseFinance) && (
            <>
              {canUsePurchases && (
                <button
                  className={section === "purchases" ? "active" : ""}
                  onClick={() => setSection("purchases")}
                >
                  Compras
                </button>
              )}
              {canUseFinance && (
                <button
                  className={section === "finance" ? "active" : ""}
                  onClick={() => setSection("finance")}
                >
                  Financeiro
                </button>
              )}
            </>
          )}
          {fullAccess &&
            specializedModules
              .filter((module) => hasModule(modules, module))
              .map((module) => (
                <button
                  key={module}
                  className={section === `module:${module}` ? "active" : ""}
                  onClick={() => setSection(`module:${module}`)}
                >
                  {module === "expiry_control"
                    ? "Validades"
                    : module === "service_orders"
                      ? "Ordens de serviço"
                      : module === "appointments"
                        ? "Agenda"
                        : module === "bom"
                          ? "Ficha técnica"
                          : module === "mrp"
                            ? "MRP"
                            : module === "quality"
                              ? "Qualidade"
                              : module === "production"
                                ? "Produção"
                                : module === "promotions"
                                  ? "Promoções"
                                  : module === "fiscal"
                                    ? "Fiscal"
                                    : "Contratos"}
                </button>
              ))}
        </nav>
        <button className="logout" onClick={logout}>
          Sair
        </button>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <small>Empresa atual</small>
            <h2>{company?.name ?? "Crie sua empresa"}</h2>
          </div>
          {companies.length > 0 && (
            <div className="company-selectors">
              <select
                value={companyId}
                onChange={(event) => {
                  const nextCompany = companies.find(
                    (item) => item.id === event.target.value,
                  );
                  setBranchId("");
                  localStorage.removeItem("erp-branch");
                  setCompanyId(event.target.value);
                  setSection(
                    defaultSectionForRole(
                      nextCompany?.role,
                      nextCompany?.modules,
                    ),
                  );
                }}
              >
                {companies.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              {branches.length > 0 && (
                <select
                  value={branchId}
                  onChange={(event) => {
                    setBranchId(event.target.value);
                    localStorage.setItem("erp-branch", event.target.value);
                  }}
                  aria-label="Filial ativa"
                >
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </header>

        {error && (
          <div className="alert">
            {error}
            <button onClick={() => setError("")}>×</button>
          </div>
        )}

        {companies.length === 0 ? (
          <CreateCompany
            token={token}
            onCreated={(created) => {
              setCompanies([created]);
              setCompanyId(created.id);
            }}
          />
        ) : section === "settings" ? (
          <CompanyModules
            key={companyId}
            token={token}
            companyId={companyId}
            modules={modules}
            onChanged={(updatedModules) =>
              setCompanies((current) =>
                current.map((item) =>
                  item.id === companyId
                    ? { ...item, modules: updatedModules }
                    : item,
                ),
              )
            }
          />
        ) : section === "module:promotions" ? (
          <Promotions token={token} companyId={companyId} products={products} />
        ) : section === "module:expiry_control" ? (
          <ExpiryControl
            token={token}
            companyId={companyId}
            products={products}
          />
        ) : section === "module:bom" ||
          section === "module:production" ||
          section === "module:mrp" ? (
          <Production
            token={token}
            companyId={companyId}
            products={products}
            module={section.slice(7) as CompanyModule}
          />
        ) : section === "module:service_orders" ||
          section === "module:appointments" ||
          section === "module:contracts" ? (
          <Services
            token={token}
            companyId={companyId}
            customers={customers}
            module={section.slice(7) as CompanyModule}
          />
        ) : section.startsWith("module:") ? (
          <ModuleWorkspace
            key={`${companyId}-${section}`}
            token={token}
            companyId={companyId}
            module={section.slice(7) as CompanyModule}
          />
        ) : section === "dashboard" ? (
          <Dashboard
            token={token}
            companyId={companyId}
            companyRole={company?.role ?? "cashier"}
            companySegment={company?.segment ?? "other"}
            modules={modules}
            products={products}
            lowStock={lowStock}
          />
        ) : section === "pdv" ? (
          <Pdv
            key={companyId}
            token={token}
            companyId={companyId}
            companyRole={company?.role ?? "cashier"}
            products={products}
            customers={customers}
            onSaleCompleted={() =>
              loadProducts(token, companyId, setProducts, setError)
            }
          />
        ) : section === "products" ? (
          <Products
            token={token}
            companyId={companyId}
            products={products}
            onChanged={() =>
              loadProducts(token, companyId, setProducts, setError)
            }
          />
        ) : section === "stock" ? (
          <Stock
            token={token}
            companyId={companyId}
            products={products}
            onChanged={() =>
              loadProducts(token, companyId, setProducts, setError)
            }
          />
        ) : section === "customers" ? (
          <Customers
            token={token}
            companyId={companyId}
            customers={customers}
            onChanged={() =>
              loadCustomers(token, companyId, setCustomers, setError)
            }
          />
        ) : section === "team" ? (
          <Team token={token} companyId={companyId} />
        ) : section === "finance" ? (
          <Finance key={companyId} token={token} companyId={companyId} />
        ) : (
          <Purchases
            key={companyId}
            token={token}
            companyId={companyId}
            products={products}
            onChanged={() =>
              loadProducts(token, companyId, setProducts, setError)
            }
          />
        )}
      </main>
    </div>
  );
}

export default App;
