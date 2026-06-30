import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type Company = { id: string; name: string; role: string };
type Product = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  salePrice: string;
  costPrice: string;
  stockQuantity: string;
  minimumStock: string;
};
type StockMovement = {
  id: string;
  productId: string;
  type: "in" | "out" | "adjustment";
  quantity: string;
  previousQuantity: string;
  resultingQuantity: string;
  reason: string | null;
  createdAt: string;
};
type CashSession = {
  id: string;
  openingAmount: string;
  openedAt: string;
  status: "open" | "closed";
};
type CartItem = { product: Product; quantity: number };
type CashSummary = {
  salesCount: number;
  salesTotal: string;
  expectedCashAmount: string;
  payments: Record<"cash" | "pix" | "debit_card" | "credit_card", string>;
};
type Sale = {
  id: string;
  status: "completed" | "cancelled";
  total: string;
  createdAt: string;
};
type SaleReceipt = Sale & {
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
type Customer = {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
};
type ReportOverview = {
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
type FinancialEntry = {
  id: string;
  type: "payable" | "receivable";
  description: string;
  category: string | null;
  amount: string;
  dueDate: string;
  status: "pending" | "paid";
  paidAt: string | null;
};
type FinanceSummary = Record<
  "payable" | "receivable",
  { pending: string; paid: string; count: number }
>;
type Supplier = {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
};
type Purchase = {
  id: string;
  supplierName: string;
  status: "completed" | "cancelled";
  invoiceNumber: string | null;
  total: string;
  dueDate: string | null;
  createdAt: string;
};

async function api<T>(path: string, options: RequestInit = {}, token?: string) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : body?.message;
    throw new Error(message ?? "Não foi possível concluir a operação.");
  }

  return response.json() as Promise<T>;
}

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem("erp-token") ?? "",
  );
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [section, setSection] = useState<
    | "dashboard"
    | "pdv"
    | "products"
    | "stock"
    | "customers"
    | "finance"
    | "purchases"
  >("dashboard");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    void api<Company[]>("/companies", {}, token)
      .then((items) => {
        setCompanies(items);
        setCompanyId((current) => current || items[0]?.id || "");
      })
      .catch((reason: Error) => setError(reason.message));
  }, [token]);

  useEffect(() => {
    if (!token || !companyId) return;
    void Promise.all([
      loadProducts(token, companyId, setProducts, setError),
      loadCustomers(token, companyId, setCustomers, setError),
    ]);
  }, [token, companyId]);

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
  }

  if (!token) return <AuthScreen onAuthenticated={authenticate} />;

  const company = companies.find((item) => item.id === companyId);
  const lowStock = products.filter(
    (product) => Number(product.stockQuantity) <= Number(product.minimumStock),
  ).length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span>EP</span>
          <strong>ERP PDV</strong>
        </div>
        <nav>
          <button
            className={section === "dashboard" ? "active" : ""}
            onClick={() => setSection("dashboard")}
          >
            Visão geral
          </button>
          <button
            className={section === "pdv" ? "active" : ""}
            onClick={() => setSection("pdv")}
          >
            PDV
          </button>
          <button
            className={section === "products" ? "active" : ""}
            onClick={() => setSection("products")}
          >
            Produtos
          </button>
          <button
            className={section === "stock" ? "active" : ""}
            onClick={() => setSection("stock")}
          >
            Estoque
          </button>
          <button
            className={section === "customers" ? "active" : ""}
            onClick={() => setSection("customers")}
          >
            Clientes
          </button>
          {company?.role !== "cashier" && (
            <>
              <button
                className={section === "purchases" ? "active" : ""}
                onClick={() => setSection("purchases")}
              >
                Compras
              </button>
              <button
                className={section === "finance" ? "active" : ""}
                onClick={() => setSection("finance")}
              >
                Financeiro
              </button>
            </>
          )}
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
            <select
              value={companyId}
              onChange={(event) => {
                const nextCompany = companies.find(
                  (item) => item.id === event.target.value,
                );
                setCompanyId(event.target.value);
                if (
                  nextCompany?.role === "cashier" &&
                  (section === "finance" || section === "purchases")
                ) {
                  setSection("dashboard");
                }
              }}
            >
              {companies.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
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
        ) : section === "dashboard" ? (
          <Dashboard
            token={token}
            companyId={companyId}
            companyRole={company?.role ?? "cashier"}
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

async function loadCustomers(
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

async function loadProducts(
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

function AuthScreen({
  onAuthenticated,
}: {
  onAuthenticated: (token: string) => void;
}) {
  const [register, setRegister] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email"));
    const password = String(data.get("password"));
    try {
      if (register)
        await api("/users", {
          method: "POST",
          body: JSON.stringify({ name: data.get("name"), email, password }),
        });
      const result = await api<{ accessToken: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onAuthenticated(result.accessToken);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Erro ao autenticar.",
      );
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-hero">
        <div className="brand light">
          <span>EP</span>
          <strong>ERP PDV</strong>
        </div>
        <div>
          <p>Gestão simples. Venda rápida.</p>
          <h1>Seu negócio inteiro, em um só lugar.</h1>
        </div>
      </section>
      <section className="auth-panel">
        <form onSubmit={submit}>
          <div>
            <small>BEM-VINDO</small>
            <h2>{register ? "Crie sua conta" : "Acesse sua operação"}</h2>
          </div>
          {error && <div className="alert">{error}</div>}
          {register && (
            <label>
              Nome
              <input name="name" required minLength={2} />
            </label>
          )}
          <label>
            E-mail
            <input name="email" type="email" required />
          </label>
          <label>
            Senha
            <input name="password" type="password" required minLength={6} />
          </label>
          <button className="primary" type="submit">
            {register ? "Criar conta" : "Entrar"}
          </button>
          <button
            className="link"
            type="button"
            onClick={() => {
              setRegister(!register);
              setError("");
            }}
          >
            {register ? "Já tenho uma conta" : "Criar minha conta"}
          </button>
        </form>
      </section>
    </div>
  );
}

function CreateCompany({
  token,
  onCreated,
}: {
  token: string;
  onCreated: (company: Company) => void;
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onCreated(
      await api<Company>(
        "/companies",
        {
          method: "POST",
          body: JSON.stringify({
            name: data.get("name"),
            document: data.get("document") || undefined,
          }),
        },
        token,
      ),
    );
  }
  return (
    <section className="empty-state">
      <div className="empty-icon">⌂</div>
      <h1>Vamos configurar sua empresa</h1>
      <p>Isso leva menos de um minuto.</p>
      <form className="inline-form" onSubmit={(event) => void submit(event)}>
        <input name="name" placeholder="Nome da empresa" required />
        <input name="document" placeholder="CNPJ (opcional)" />
        <button className="primary">Criar empresa</button>
      </form>
    </section>
  );
}

function Dashboard({
  token,
  companyId,
  companyRole,
  products,
  lowStock,
}: {
  token: string;
  companyId: string;
  companyRole: string;
  products: Product[];
  lowStock: number;
}) {
  const today = new Date();
  const [from, setFrom] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`,
  );
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [report, setReport] = useState<ReportOverview | null>(null);
  const [reportError, setReportError] = useState("");
  const stockValue = products.reduce(
    (sum, product) =>
      sum + Number(product.salePrice) * Number(product.stockQuantity),
    0,
  );

  const loadReport = useCallback(async () => {
    if (companyRole === "cashier") return;
    try {
      setReport(
        await api<ReportOverview>(
          `/companies/${companyId}/reports/overview?from=${from}&to=${to}`,
          {},
          token,
        ),
      );
      setReportError("");
    } catch (reason) {
      setReportError(
        reason instanceof Error
          ? reason.message
          : "Erro ao carregar relatório.",
      );
    }
  }, [companyId, companyRole, from, to, token]);

  useEffect(() => {
    // Atualiza o relatório ao trocar empresa ou período.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadReport();
  }, [loadReport]);

  return (
    <>
      <section className="page-title">
        <div>
          <small>PAINEL</small>
          <h1>Visão geral</h1>
          <p>Um retrato rápido da sua operação.</p>
        </div>
      </section>
      <section className="metrics">
        <article>
          <span>Produtos ativos</span>
          <strong>{products.length}</strong>
          <small>itens cadastrados</small>
        </article>
        <article>
          <span>Valor em estoque</span>
          <strong>
            {stockValue.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </strong>
          <small>pelo preço de venda</small>
        </article>
        <article className={lowStock ? "warning" : ""}>
          <span>Estoque baixo</span>
          <strong>{lowStock}</strong>
          <small>itens pedindo atenção</small>
        </article>
      </section>
      {companyRole !== "cashier" && (
        <section className="panel">
          <div className="table-heading">
            <div>
              <h3>Desempenho do período</h3>
              <small>Somente vendas concluídas</small>
            </div>
            <div className="report-filters">
              <input
                aria-label="Data inicial"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
              <input
                aria-label="Data final"
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </div>
          </div>
          {reportError && <div className="alert">{reportError}</div>}
          {report && (
            <>
              <section className="metrics report-metrics">
                <article>
                  <span>Faturamento</span>
                  <strong>
                    {formatCurrency(Number(report.sales.revenue))}
                  </strong>
                  <small>{report.sales.count} vendas</small>
                </article>
                <article>
                  <span>Ticket médio</span>
                  <strong>
                    {formatCurrency(Number(report.sales.averageTicket))}
                  </strong>
                  <small>por venda concluída</small>
                </article>
                <article>
                  <span>Descontos</span>
                  <strong>
                    {formatCurrency(Number(report.sales.discounts))}
                  </strong>
                  <small>concedidos no período</small>
                </article>
                <article>
                  <span>Clientes</span>
                  <strong>{report.customersCount}</strong>
                  <small>cadastros ativos</small>
                </article>
              </section>
              <div className="report-grid">
                <div>
                  <h3>Formas de pagamento</h3>
                  <ul className="report-list">
                    <li>
                      <span>Dinheiro</span>
                      <strong>
                        {formatCurrency(Number(report.payments.cash))}
                      </strong>
                    </li>
                    <li>
                      <span>Pix</span>
                      <strong>
                        {formatCurrency(Number(report.payments.pix))}
                      </strong>
                    </li>
                    <li>
                      <span>Débito</span>
                      <strong>
                        {formatCurrency(Number(report.payments.debit_card))}
                      </strong>
                    </li>
                    <li>
                      <span>Crédito</span>
                      <strong>
                        {formatCurrency(Number(report.payments.credit_card))}
                      </strong>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3>Produtos mais vendidos</h3>
                  <ul className="report-list">
                    {report.topProducts.map((product) => (
                      <li key={product.productId}>
                        <span>
                          {product.name}
                          <small>{Number(product.quantity)} un.</small>
                        </span>
                        <strong>
                          {formatCurrency(Number(product.revenue))}
                        </strong>
                      </li>
                    ))}
                    {!report.topProducts.length && (
                      <li>
                        <span>Nenhuma venda no período.</span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </>
          )}
        </section>
      )}
      <section className="panel">
        <h3>Próximos passos</h3>
        <div className="roadmap">
          <span className="done">✓ Produtos e estoque</span>
          <span className="done">✓ Caixa e vendas</span>
          <span className="done">✓ Clientes</span>
          <span className="done">✓ Relatórios</span>
        </div>
      </section>
    </>
  );
}

function Products({
  token,
  companyId,
  products,
  onChanged,
}: {
  token: string;
  companyId: string;
  products: Product[];
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<Product | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await api<Product>(
        editing
          ? `/companies/${companyId}/products/${editing.id}`
          : `/companies/${companyId}/products`,
        {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify({
            name: data.get("name"),
            barcode: data.get("barcode") || "",
            salePrice: Number(data.get("salePrice")),
            costPrice: Number(data.get("costPrice") || 0),
            minimumStock: Number(data.get("minimumStock") || 0),
            stockQuantity: Number(data.get("stockQuantity") || 0),
          }),
        },
        token,
      );
      form.reset();
      setEditing(null);
      setFeedback({
        kind: "success",
        text: "Produto e saldo salvos com sucesso.",
      });
      onChanged();
    } catch (reason) {
      setFeedback({
        kind: "error",
        text:
          reason instanceof Error ? reason.message : "Erro ao salvar produto.",
      });
    }
  }

  return (
    <>
      <section className="page-title">
        <div>
          <small>CATÁLOGO</small>
          <h1>Produtos</h1>
        </div>
      </section>
      {feedback && (
        <div
          className={`alert ${feedback.kind === "success" ? "success" : ""}`}
        >
          {feedback.text}
          <button onClick={() => setFeedback(null)}>×</button>
        </div>
      )}
      <section className="panel">
        <h3>{editing ? `Editar ${editing.name}` : "Novo produto"}</h3>
        <form
          key={editing?.id ?? "new-product"}
          className="product-form"
          onSubmit={(event) => void submit(event)}
        >
          <label>
            <span>Nome do produto</span>
            <input name="name" required defaultValue={editing?.name} />
          </label>
          <label>
            <span>Código de barras</span>
            <input name="barcode" defaultValue={editing?.barcode ?? ""} />
          </label>
          <label>
            <span>Preço de venda</span>
            <input
              name="salePrice"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={editing?.salePrice}
            />
          </label>
          <label>
            <span>Preço de custo</span>
            <input
              name="costPrice"
              type="number"
              step="0.01"
              min="0"
              defaultValue={editing?.costPrice}
            />
          </label>
          <label>
            <span>Alerta de estoque mínimo</span>
            <input
              name="minimumStock"
              type="number"
              step="0.001"
              min="0"
              defaultValue={editing?.minimumStock}
            />
            <small>Apenas dispara o aviso de estoque baixo.</small>
          </label>
          <label>
            <span>Quantidade disponível</span>
            <input
              name="stockQuantity"
              type="number"
              step="0.001"
              min="0"
              defaultValue={editing?.stockQuantity ?? 0}
            />
            <small>Este é o saldo real disponível para venda.</small>
          </label>
          <div className="form-actions">
            <button className="primary">
              {editing ? "Salvar" : "Adicionar"}
            </button>
            {editing && (
              <button
                className="secondary"
                type="button"
                onClick={() => setEditing(null)}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
        {!editing && (
          <p className="sku-hint">
            O SKU será criado automaticamente. A quantidade disponível será
            registrada no histórico.
          </p>
        )}
      </section>
      <ProductTable
        products={products}
        onEdit={(product) => {
          setEditing(product);
          setFeedback(null);
        }}
      />
    </>
  );
}

function ProductTable({
  products,
  onEdit,
}: {
  products: Product[];
  onEdit?: (product: Product) => void;
}) {
  return (
    <section className="panel table-panel">
      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th>SKU</th>
            <th>Preço</th>
            <th>Estoque</th>
            {onEdit && <th></th>}
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>
                <strong>{product.name}</strong>
              </td>
              <td>{product.sku}</td>
              <td>
                {Number(product.salePrice).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </td>
              <td>
                <span
                  className={
                    Number(product.stockQuantity) <=
                    Number(product.minimumStock)
                      ? "stock-low"
                      : "stock-ok"
                  }
                >
                  {Number(product.stockQuantity)}
                </span>
              </td>
              {onEdit && (
                <td>
                  <button
                    className="table-action"
                    onClick={() => onEdit(product)}
                  >
                    Editar
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {products.length === 0 && (
        <p className="empty-row">Nenhum produto cadastrado.</p>
      )}
    </section>
  );
}

function Pdv({
  token,
  companyId,
  companyRole,
  products,
  customers,
  onSaleCompleted,
}: {
  token: string;
  companyId: string;
  companyRole: string;
  products: Product[];
  customers: Customer[];
  onSaleCompleted: () => void;
}) {
  const [session, setSession] = useState<CashSession | null>();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [customerId, setCustomerId] = useState("");
  const [cashReceived, setCashReceived] = useState(0);
  const [summary, setSummary] = useState<CashSummary | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [lastChange, setLastChange] = useState(0);
  const [receipt, setReceipt] = useState<SaleReceipt | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);

  const refreshPdvData = useCallback(
    async (sessionId: string) => {
      const [cashSummary, sales] = await Promise.all([
        api<CashSummary>(
          `/companies/${companyId}/cash-sessions/${sessionId}/summary`,
          {},
          token,
        ),
        api<Sale[]>(`/companies/${companyId}/sales`, {}, token),
      ]);
      setSummary(cashSummary);
      setRecentSales(sales);
    },
    [companyId, token],
  );

  useEffect(() => {
    void api<CashSession | null>(
      `/companies/${companyId}/cash-sessions/current`,
      {},
      token,
    )
      .then(async (currentSession) => {
        setSession(currentSession);
        if (currentSession) await refreshPdvData(currentSession.id);
      })
      .catch((reason: Error) => {
        setFeedback({ kind: "error", text: reason.message });
        setSession(null);
      });
  }, [companyId, refreshPdvData, token]);

  async function openCash(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const opened = await api<CashSession>(
        `/companies/${companyId}/cash-sessions/open`,
        {
          method: "POST",
          body: JSON.stringify({
            openingAmount: Number(data.get("openingAmount") || 0),
          }),
        },
        token,
      );
      setSession(opened);
      await refreshPdvData(opened.id);
      setFeedback({ kind: "success", text: "Caixa aberto. Boas vendas!" });
    } catch (reason) {
      setFeedback({
        kind: "error",
        text: reason instanceof Error ? reason.message : "Erro ao abrir caixa.",
      });
    }
  }

  function addProduct(product: Product) {
    if (Number(product.stockQuantity) <= 0) {
      setFeedback({ kind: "error", text: `${product.name} está sem estoque.` });
      return;
    }
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (!existing) return [...current, { product, quantity: 1 }];
      if (existing.quantity >= Number(product.stockQuantity)) return current;
      return current.map((item) =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      );
    });
  }

  function handleProductCode(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const code = search.trim().toLowerCase();
    if (!code) return;
    const product = products.find(
      (item) =>
        item.barcode?.trim().toLowerCase() === code ||
        item.sku.trim().toLowerCase() === code,
    );
    if (!product) {
      setFeedback({
        kind: "error",
        text: `Código não cadastrado: ${search.trim()}`,
      });
      setSearch("");
      return;
    }
    addProduct(product);
    setSearch("");
    setFeedback({ kind: "success", text: `${product.name} adicionado.` });
  }

  function refocusScanner() {
    window.setTimeout(() => searchRef.current?.focus(), 0);
  }

  function changeQuantity(productId: string, quantity: number) {
    setCart((current) =>
      current
        .map((item) =>
          item.product.id === productId
            ? {
                ...item,
                quantity: Math.min(
                  Math.max(quantity, 0),
                  Number(item.product.stockQuantity),
                ),
              }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  const subtotalCents = cart.reduce(
    (total, item) =>
      total + Math.round(Number(item.product.salePrice) * 100 * item.quantity),
    0,
  );
  const subtotal = subtotalCents / 100;
  const total = Math.max(0, subtotalCents - Math.round(discount * 100)) / 100;
  const filteredProducts = products.filter((product) => {
    const term = search.trim().toLowerCase();
    return (
      Number(product.stockQuantity) > 0 &&
      (!term ||
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        product.barcode?.toLowerCase().includes(term))
    );
  });

  async function completeSale() {
    if (!session || !cart.length || total <= 0) return;
    try {
      const completedSale = await api<{ id: string; change: string }>(
        `/companies/${companyId}/sales`,
        {
          method: "POST",
          body: JSON.stringify({
            cashSessionId: session.id,
            customerId: customerId || undefined,
            items: cart.map((item) => ({
              productId: item.product.id,
              quantity: item.quantity,
            })),
            discount: Number(discount.toFixed(2)),
            payments: [
              {
                method: paymentMethod,
                amount: Number(total.toFixed(2)),
                ...(paymentMethod === "cash"
                  ? { receivedAmount: Number(cashReceived.toFixed(2)) }
                  : {}),
              },
            ],
          }),
        },
        token,
      );
      setCart([]);
      setDiscount(0);
      setCashReceived(0);
      setCustomerId("");
      setLastChange(Number(completedSale.change));
      setFeedback({ kind: "success", text: "Venda concluída com sucesso." });
      onSaleCompleted();
      await refreshPdvData(session.id);
      setReceipt(
        await api<SaleReceipt>(
          `/companies/${companyId}/sales/${completedSale.id}`,
          {},
          token,
        ),
      );
    } catch (reason) {
      setFeedback({
        kind: "error",
        text:
          reason instanceof Error ? reason.message : "Erro ao concluir venda.",
      });
    }
  }

  async function cancelSale(saleId: string) {
    if (!session) return;
    if (
      !window.confirm("Cancelar esta venda e devolver os itens ao estoque?")
    ) {
      return;
    }
    try {
      await api(
        `/companies/${companyId}/sales/${saleId}/cancel`,
        { method: "POST" },
        token,
      );
      setFeedback({
        kind: "success",
        text: "Venda cancelada e estoque devolvido.",
      });
      onSaleCompleted();
      await refreshPdvData(session.id);
    } catch (reason) {
      setFeedback({
        kind: "error",
        text:
          reason instanceof Error ? reason.message : "Erro ao cancelar venda.",
      });
    }
  }

  async function openReceipt(saleId: string) {
    try {
      setReceipt(
        await api<SaleReceipt>(
          `/companies/${companyId}/sales/${saleId}`,
          {},
          token,
        ),
      );
    } catch (reason) {
      setFeedback({
        kind: "error",
        text:
          reason instanceof Error
            ? reason.message
            : "Erro ao abrir comprovante.",
      });
    }
  }

  async function closeCash(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    if (!window.confirm("Confirma o fechamento deste caixa?")) return;
    const data = new FormData(event.currentTarget);
    try {
      const result = await api<{ difference: string }>(
        `/companies/${companyId}/cash-sessions/${session.id}/close`,
        {
          method: "POST",
          body: JSON.stringify({
            closingAmount: Number(data.get("closingAmount") || 0),
          }),
        },
        token,
      );
      setSession(null);
      setCart([]);
      setSummary(null);
      setFeedback({
        kind: "success",
        text: `Caixa fechado. Diferença: ${formatCurrency(Number(result.difference))}.`,
      });
    } catch (reason) {
      setFeedback({
        kind: "error",
        text:
          reason instanceof Error ? reason.message : "Erro ao fechar caixa.",
      });
    }
  }

  if (session === undefined) {
    return <p className="loading-state">Carregando caixa...</p>;
  }

  if (!session) {
    return (
      <section className="empty-state cash-opening">
        <div className="empty-icon">$</div>
        <h1>Abra o caixa para começar</h1>
        <p>Informe o valor disponível em dinheiro no início do turno.</p>
        {feedback && (
          <div
            className={`alert ${feedback.kind === "success" ? "success" : ""}`}
          >
            {feedback.text}
          </div>
        )}
        <form onSubmit={(event) => void openCash(event)}>
          <label>
            Fundo de troco
            <input
              name="openingAmount"
              type="number"
              min="0"
              step="0.01"
              defaultValue="0.00"
              required
            />
          </label>
          <button className="primary">Abrir caixa</button>
        </form>
      </section>
    );
  }

  return (
    <>
      <section className="page-title pdv-title">
        <div>
          <small>CAIXA ABERTO</small>
          <h1>Ponto de venda</h1>
          <p>
            Aberto às {new Date(session.openedAt).toLocaleTimeString("pt-BR")}
          </p>
        </div>
        <form
          className="close-cash"
          onSubmit={(event) => void closeCash(event)}
        >
          <input
            name="closingAmount"
            type="number"
            min="0"
            step="0.01"
            placeholder={
              summary
                ? `Esperado ${formatCurrency(Number(summary.expectedCashAmount))}`
                : "Valor contado"
            }
            required
          />
          <button className="secondary">Fechar caixa</button>
        </form>
      </section>
      {feedback && (
        <div
          className={`alert ${feedback.kind === "success" ? "success" : ""}`}
        >
          {feedback.text}
          <button onClick={() => setFeedback(null)}>×</button>
        </div>
      )}
      {lastChange > 0 && (
        <div className="change-banner">
          Troco a devolver: <strong>{formatCurrency(lastChange)}</strong>
          <button onClick={() => setLastChange(0)}>OK</button>
        </div>
      )}
      {summary && (
        <section className="cash-summary">
          <article>
            <span>Vendas</span>
            <strong>{summary.salesCount}</strong>
          </article>
          <article>
            <span>Total vendido</span>
            <strong>{formatCurrency(Number(summary.salesTotal))}</strong>
          </article>
          <article>
            <span>Dinheiro no caixa</span>
            <strong>
              {formatCurrency(Number(summary.expectedCashAmount))}
            </strong>
          </article>
          <article>
            <span>Pix + cartões</span>
            <strong>
              {formatCurrency(
                Number(summary.payments.pix) +
                  Number(summary.payments.debit_card) +
                  Number(summary.payments.credit_card),
              )}
            </strong>
          </article>
        </section>
      )}
      <section className="pdv-layout">
        <div className="pdv-catalog panel">
          <input
            ref={searchRef}
            className="product-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={handleProductCode}
            placeholder="Buscar por nome, SKU ou código de barras"
            autoFocus
          />
          <small className="scanner-hint">
            Leitor ativo: bipar o código e pressionar Enter
          </small>
          <div className="pdv-products">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => {
                  addProduct(product);
                  refocusScanner();
                }}
              >
                <strong>{product.name}</strong>
                <small>{product.sku}</small>
                <span>{formatCurrency(Number(product.salePrice))}</span>
                <em>Saldo {Number(product.stockQuantity)}</em>
              </button>
            ))}
            {!filteredProducts.length && (
              <p className="empty-row">Nenhum produto disponível.</p>
            )}
          </div>
        </div>
        <aside className="cart panel">
          <div className="cart-header">
            <h3>Venda atual</h3>
            <span>{cart.length} itens</span>
          </div>
          <div className="cart-items">
            {cart.map((item) => (
              <article key={item.product.id}>
                <div>
                  <strong>{item.product.name}</strong>
                  <small>
                    {formatCurrency(Number(item.product.salePrice))}
                  </small>
                </div>
                <input
                  aria-label={`Quantidade de ${item.product.name}`}
                  type="number"
                  min="0"
                  max={item.product.stockQuantity}
                  step="0.001"
                  value={item.quantity}
                  onChange={(event) =>
                    changeQuantity(item.product.id, Number(event.target.value))
                  }
                />
                <strong>
                  {formatCurrency(
                    Number(item.product.salePrice) * item.quantity,
                  )}
                </strong>
              </article>
            ))}
            {!cart.length && (
              <p className="empty-row">Selecione produtos para iniciar.</p>
            )}
          </div>
          <div className="cart-summary">
            <label>
              Cliente (opcional)
              <select
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
              >
                <option value="">Consumidor final</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Desconto
              <input
                type="number"
                min="0"
                max={subtotal}
                step="0.01"
                value={discount}
                onChange={(event) => setDiscount(Number(event.target.value))}
              />
            </label>
            <label>
              Pagamento
              <select
                value={paymentMethod}
                onChange={(event) => {
                  setPaymentMethod(event.target.value);
                  setCashReceived(0);
                }}
              >
                <option value="cash">Dinheiro</option>
                <option value="pix">Pix</option>
                <option value="debit_card">Cartão de débito</option>
                <option value="credit_card">Cartão de crédito</option>
              </select>
            </label>
            {paymentMethod === "cash" && (
              <label className="cash-received">
                Valor recebido
                <input
                  type="number"
                  min={total}
                  step="0.01"
                  value={cashReceived || ""}
                  onChange={(event) =>
                    setCashReceived(Number(event.target.value))
                  }
                  placeholder={formatCurrency(total)}
                />
                <small>
                  Troco: {formatCurrency(Math.max(0, cashReceived - total))}
                </small>
              </label>
            )}
            <div className="total-line">
              <span>Total</span>
              <strong>{formatCurrency(total)}</strong>
            </div>
            <button
              className="primary checkout"
              disabled={
                !cart.length ||
                total <= 0 ||
                (paymentMethod === "cash" && cashReceived < total)
              }
              onClick={() => void completeSale()}
            >
              Finalizar venda
            </button>
          </div>
        </aside>
      </section>
      <section className="panel table-panel recent-sales">
        <div className="table-heading">
          <h3>Vendas recentes</h3>
          <span>Últimas 50</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Venda</th>
              <th>Total</th>
              <th>Status</th>
              {companyRole !== "cashier" && <th></th>}
            </tr>
          </thead>
          <tbody>
            {recentSales.map((sale) => (
              <tr key={sale.id}>
                <td>{new Date(sale.createdAt).toLocaleString("pt-BR")}</td>
                <td>{sale.id.slice(0, 8).toUpperCase()}</td>
                <td>{formatCurrency(Number(sale.total))}</td>
                <td>
                  <span
                    className={
                      sale.status === "completed" ? "sale-ok" : "sale-cancelled"
                    }
                  >
                    {sale.status === "completed" ? "Concluída" : "Cancelada"}
                  </span>
                </td>
                {companyRole !== "cashier" && (
                  <td>
                    <button
                      className="table-action"
                      onClick={() => void openReceipt(sale.id)}
                    >
                      Comprovante
                    </button>{" "}
                    {sale.status === "completed" && (
                      <button
                        className="danger-action"
                        onClick={() => void cancelSale(sale.id)}
                      >
                        Cancelar
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!recentSales.length && (
          <p className="empty-row">Nenhuma venda neste histórico.</p>
        )}
      </section>
      {receipt && (
        <div className="receipt-overlay" role="dialog" aria-modal="true">
          <article className="receipt">
            <div className="receipt-actions">
              <button
                className="secondary"
                onClick={() => {
                  setReceipt(null);
                  refocusScanner();
                }}
              >
                Fechar
              </button>
              <button className="primary" onClick={() => window.print()}>
                Imprimir
              </button>
            </div>
            <header>
              <h2>ERP PDV</h2>
              <p>Comprovante de venda</p>
              <small>
                {new Date(receipt.createdAt).toLocaleString("pt-BR")}
              </small>
            </header>
            <p>
              <strong>Venda:</strong> {receipt.id.toUpperCase()}
            </p>
            <p>
              <strong>Cliente:</strong>{" "}
              {receipt.customerName ?? "Consumidor final"}
            </p>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qtd.</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {receipt.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.productName}</td>
                    <td>{Number(item.quantity)}</td>
                    <td>{formatCurrency(Number(item.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="receipt-totals">
              <span>
                Subtotal{" "}
                <strong>{formatCurrency(Number(receipt.subtotal))}</strong>
              </span>
              <span>
                Desconto{" "}
                <strong>{formatCurrency(Number(receipt.discount))}</strong>
              </span>
              <span>
                Total <strong>{formatCurrency(Number(receipt.total))}</strong>
              </span>
            </div>
            <footer>Obrigado pela preferência.</footer>
          </article>
        </div>
      )}
    </>
  );
}

function Customers({
  token,
  companyId,
  customers,
  onChanged,
}: {
  token: string;
  companyId: string;
  customers: Customer[];
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<Customer | null>(null);
  const [feedback, setFeedback] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await api(
        editing
          ? `/companies/${companyId}/customers/${editing.id}`
          : `/companies/${companyId}/customers`,
        {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify({
            name: data.get("name"),
            document: data.get("document") || undefined,
            email: data.get("email") || undefined,
            phone: data.get("phone") || undefined,
          }),
        },
        token,
      );
      form.reset();
      setEditing(null);
      setFeedback("Cliente salvo com sucesso.");
      onChanged();
    } catch (reason) {
      setFeedback(
        reason instanceof Error ? reason.message : "Erro ao salvar cliente.",
      );
    }
  }

  async function deactivate(customer: Customer) {
    if (!window.confirm(`Inativar ${customer.name}?`)) return;
    try {
      await api(
        `/companies/${companyId}/customers/${customer.id}`,
        { method: "PATCH", body: JSON.stringify({ isActive: false }) },
        token,
      );
      setEditing(null);
      setFeedback("Cliente inativado.");
      onChanged();
    } catch (reason) {
      setFeedback(
        reason instanceof Error ? reason.message : "Erro ao inativar cliente.",
      );
    }
  }

  return (
    <>
      <section className="page-title">
        <div>
          <small>RELACIONAMENTO</small>
          <h1>Clientes</h1>
          <p>Cadastre clientes e identifique as vendas no PDV.</p>
        </div>
      </section>
      {feedback && (
        <div className="alert success">
          {feedback}
          <button onClick={() => setFeedback("")}>×</button>
        </div>
      )}
      <section className="panel">
        <h3>{editing ? `Editar ${editing.name}` : "Novo cliente"}</h3>
        <form
          key={editing?.id ?? "new-customer"}
          className="product-form"
          onSubmit={(event) => void submit(event)}
        >
          <label>
            <span>Nome</span>
            <input
              name="name"
              required
              minLength={2}
              defaultValue={editing?.name}
            />
          </label>
          <label>
            <span>CPF ou CNPJ</span>
            <input name="document" defaultValue={editing?.document ?? ""} />
          </label>
          <label>
            <span>E-mail</span>
            <input
              name="email"
              type="email"
              defaultValue={editing?.email ?? ""}
            />
          </label>
          <label>
            <span>Telefone</span>
            <input name="phone" defaultValue={editing?.phone ?? ""} />
          </label>
          <div className="form-actions">
            <button className="primary">
              {editing ? "Salvar" : "Adicionar"}
            </button>
            {editing && (
              <button
                className="secondary"
                type="button"
                onClick={() => setEditing(null)}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>
      <section className="panel table-panel">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Documento</th>
              <th>Contato</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id}>
                <td>
                  <strong>{customer.name}</strong>
                </td>
                <td>{customer.document ?? "—"}</td>
                <td>{customer.email ?? customer.phone ?? "—"}</td>
                <td>
                  <button
                    className="table-action"
                    onClick={() => setEditing(customer)}
                  >
                    Editar
                  </button>{" "}
                  <button
                    className="danger-action"
                    onClick={() => void deactivate(customer)}
                  >
                    Inativar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!customers.length && (
          <p className="empty-row">Nenhum cliente cadastrado.</p>
        )}
      </section>
    </>
  );
}

function Purchases({
  token,
  companyId,
  products,
  onChanged,
}: {
  token: string;
  companyId: string;
  products: Product[];
  onChanged: () => void;
}) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [items, setItems] = useState([
    { productId: "", quantity: 1, unitCost: 0 },
  ]);
  const [feedback, setFeedback] = useState("");
  const load = useCallback(async () => {
    try {
      const [supplierRows, purchaseRows] = await Promise.all([
        api<Supplier[]>(`/companies/${companyId}/suppliers`, {}, token),
        api<Purchase[]>(`/companies/${companyId}/purchases`, {}, token),
      ]);
      setSuppliers(supplierRows);
      setPurchases(purchaseRows);
    } catch (reason) {
      setFeedback(
        reason instanceof Error ? reason.message : "Erro ao carregar compras.",
      );
    }
  }, [companyId, token]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  async function createSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await api(
        `/companies/${companyId}/suppliers`,
        {
          method: "POST",
          body: JSON.stringify({
            name: data.get("name"),
            document: data.get("document") || undefined,
            email: data.get("email") || undefined,
            phone: data.get("phone") || undefined,
          }),
        },
        token,
      );
      form.reset();
      setFeedback("Fornecedor cadastrado.");
      await load();
    } catch (reason) {
      setFeedback(
        reason instanceof Error
          ? reason.message
          : "Erro ao cadastrar fornecedor.",
      );
    }
  }
  async function createPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await api(
        `/companies/${companyId}/purchases`,
        {
          method: "POST",
          body: JSON.stringify({
            supplierId: data.get("supplierId"),
            invoiceNumber: data.get("invoiceNumber") || undefined,
            dueDate: data.get("dueDate") || undefined,
            items,
          }),
        },
        token,
      );
      form.reset();
      setItems([{ productId: "", quantity: 1, unitCost: 0 }]);
      setFeedback("Compra registrada; estoque e financeiro atualizados.");
      await load();
      onChanged();
    } catch (reason) {
      setFeedback(
        reason instanceof Error ? reason.message : "Erro ao registrar compra.",
      );
    }
  }
  async function cancel(purchase: Purchase) {
    if (
      !window.confirm(
        "Cancelar a compra, retirar os itens do estoque e remover a conta pendente?",
      )
    )
      return;
    try {
      await api(
        `/companies/${companyId}/purchases/${purchase.id}/cancel`,
        { method: "POST" },
        token,
      );
      setFeedback("Compra cancelada.");
      await load();
      onChanged();
    } catch (reason) {
      setFeedback(
        reason instanceof Error ? reason.message : "Erro ao cancelar compra.",
      );
    }
  }
  return (
    <>
      <section className="page-title">
        <div>
          <small>SUPRIMENTOS</small>
          <h1>Fornecedores e compras</h1>
          <p>Entradas atualizam estoque, custo e contas a pagar.</p>
        </div>
      </section>
      {feedback && (
        <div className="alert success">
          {feedback}
          <button onClick={() => setFeedback("")}>×</button>
        </div>
      )}
      <section className="panel">
        <h3>Novo fornecedor</h3>
        <form
          className="product-form"
          onSubmit={(event) => void createSupplier(event)}
        >
          <label>
            <span>Nome</span>
            <input name="name" required minLength={2} />
          </label>
          <label>
            <span>CPF/CNPJ</span>
            <input name="document" />
          </label>
          <label>
            <span>E-mail</span>
            <input name="email" type="email" />
          </label>
          <label>
            <span>Telefone</span>
            <input name="phone" />
          </label>
          <div className="form-actions">
            <button className="primary">Cadastrar</button>
          </div>
        </form>
      </section>
      <section className="panel">
        <h3>Registrar compra</h3>
        <form onSubmit={(event) => void createPurchase(event)}>
          <div className="product-form">
            <label>
              <span>Fornecedor</span>
              <select name="supplierId" required defaultValue="">
                <option value="" disabled>
                  Selecione
                </option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Nota fiscal</span>
              <input name="invoiceNumber" />
            </label>
            <label>
              <span>Vencimento da conta</span>
              <input name="dueDate" type="date" />
            </label>
          </div>
          <div className="purchase-items">
            <h4>Itens</h4>
            {items.map((item, index) => (
              <div className="purchase-item" key={index}>
                <select
                  required
                  value={item.productId}
                  onChange={(event) =>
                    setItems((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index
                          ? { ...row, productId: event.target.value }
                          : row,
                      ),
                    )
                  }
                >
                  <option value="" disabled>
                    Produto
                  </option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <input
                  aria-label="Quantidade"
                  type="number"
                  min="0.001"
                  step="0.001"
                  required
                  value={item.quantity}
                  onChange={(event) =>
                    setItems((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index
                          ? { ...row, quantity: Number(event.target.value) }
                          : row,
                      ),
                    )
                  }
                />
                <input
                  aria-label="Custo unitário"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={item.unitCost || ""}
                  placeholder="Custo unitário"
                  onChange={(event) =>
                    setItems((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index
                          ? { ...row, unitCost: Number(event.target.value) }
                          : row,
                      ),
                    )
                  }
                />
                {items.length > 1 && (
                  <button
                    type="button"
                    className="danger-action"
                    onClick={() =>
                      setItems((current) =>
                        current.filter((_, rowIndex) => rowIndex !== index),
                      )
                    }
                  >
                    Remover
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="secondary"
              onClick={() =>
                setItems((current) => [
                  ...current,
                  { productId: "", quantity: 1, unitCost: 0 },
                ])
              }
            >
              Adicionar item
            </button>
            <button
              className="primary"
              disabled={!suppliers.length || !products.length}
            >
              Registrar compra
            </button>
          </div>
        </form>
      </section>
      <section className="panel table-panel">
        <h3>Compras recentes</h3>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Fornecedor</th>
              <th>NF</th>
              <th>Total</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((purchase) => (
              <tr key={purchase.id}>
                <td>
                  {new Date(purchase.createdAt).toLocaleDateString("pt-BR")}
                </td>
                <td>{purchase.supplierName}</td>
                <td>{purchase.invoiceNumber ?? "—"}</td>
                <td>{formatCurrency(Number(purchase.total))}</td>
                <td>
                  <span
                    className={
                      purchase.status === "completed"
                        ? "sale-ok"
                        : "sale-cancelled"
                    }
                  >
                    {purchase.status === "completed"
                      ? "Concluída"
                      : "Cancelada"}
                  </span>
                </td>
                <td>
                  {purchase.status === "completed" && (
                    <button
                      className="danger-action"
                      onClick={() => void cancel(purchase)}
                    >
                      Cancelar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!purchases.length && (
          <p className="empty-row">Nenhuma compra registrada.</p>
        )}
      </section>
    </>
  );
}

function Finance({ token, companyId }: { token: string; companyId: string }) {
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [filter, setFilter] = useState("all");
  const [feedback, setFeedback] = useState("");

  const loadFinance = useCallback(async () => {
    try {
      const query = filter === "all" ? "" : `?status=${filter}`;
      const [items, totals] = await Promise.all([
        api<FinancialEntry[]>(
          `/companies/${companyId}/finance/entries${query}`,
          {},
          token,
        ),
        api<FinanceSummary>(
          `/companies/${companyId}/finance/summary`,
          {},
          token,
        ),
      ]);
      setEntries(items);
      setSummary(totals);
    } catch (reason) {
      setFeedback(
        reason instanceof Error
          ? reason.message
          : "Erro ao carregar o financeiro.",
      );
    }
  }, [companyId, filter, token]);

  useEffect(() => {
    // Sincroniza a tela financeira com a empresa e o filtro selecionados.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadFinance();
  }, [loadFinance]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await api(
        `/companies/${companyId}/finance/entries`,
        {
          method: "POST",
          body: JSON.stringify({
            type: data.get("type"),
            description: data.get("description"),
            category: data.get("category") || undefined,
            amount: Number(data.get("amount")),
            dueDate: data.get("dueDate"),
          }),
        },
        token,
      );
      form.reset();
      setFeedback("Lançamento criado com sucesso.");
      await loadFinance();
    } catch (reason) {
      setFeedback(
        reason instanceof Error ? reason.message : "Erro ao criar lançamento.",
      );
    }
  }

  async function settle(entry: FinancialEntry) {
    if (!window.confirm(`Confirmar a baixa de ${entry.description}?`)) return;
    try {
      await api(
        `/companies/${companyId}/finance/entries/${entry.id}/settle`,
        { method: "PATCH" },
        token,
      );
      setFeedback("Baixa registrada com sucesso.");
      await loadFinance();
    } catch (reason) {
      setFeedback(
        reason instanceof Error ? reason.message : "Erro ao baixar lançamento.",
      );
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <section className="page-title">
        <div>
          <small>CONTROLE FINANCEIRO</small>
          <h1>Contas a pagar e receber</h1>
          <p>Acompanhe compromissos, recebimentos e vencimentos.</p>
        </div>
      </section>
      {feedback && (
        <div className="alert success">
          {feedback}
          <button onClick={() => setFeedback("")}>×</button>
        </div>
      )}
      {summary && (
        <section className="metrics report-metrics">
          <article className="warning">
            <span>A pagar</span>
            <strong>{formatCurrency(Number(summary.payable.pending))}</strong>
            <small>pendente</small>
          </article>
          <article>
            <span>A receber</span>
            <strong>
              {formatCurrency(Number(summary.receivable.pending))}
            </strong>
            <small>pendente</small>
          </article>
          <article>
            <span>Pagamentos realizados</span>
            <strong>{formatCurrency(Number(summary.payable.paid))}</strong>
            <small>total baixado</small>
          </article>
          <article>
            <span>Recebimentos realizados</span>
            <strong>{formatCurrency(Number(summary.receivable.paid))}</strong>
            <small>total baixado</small>
          </article>
        </section>
      )}
      <section className="panel">
        <h3>Novo lançamento</h3>
        <form className="product-form" onSubmit={(event) => void submit(event)}>
          <label>
            <span>Tipo</span>
            <select name="type">
              <option value="payable">Conta a pagar</option>
              <option value="receivable">Conta a receber</option>
            </select>
          </label>
          <label>
            <span>Descrição</span>
            <input name="description" required minLength={2} />
          </label>
          <label>
            <span>Categoria</span>
            <input
              name="category"
              placeholder="Aluguel, fornecedor, serviço..."
            />
          </label>
          <label>
            <span>Valor</span>
            <input
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              required
            />
          </label>
          <label>
            <span>Vencimento</span>
            <input name="dueDate" type="date" defaultValue={today} required />
          </label>
          <div className="form-actions">
            <button className="primary">Adicionar lançamento</button>
          </div>
        </form>
      </section>
      <section className="panel table-panel">
        <div className="table-heading">
          <h3>Lançamentos</h3>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="all">Todos</option>
            <option value="pending">Pendentes</option>
            <option value="paid">Baixados</option>
          </select>
        </div>
        <table>
          <thead>
            <tr>
              <th>Vencimento</th>
              <th>Descrição</th>
              <th>Tipo</th>
              <th>Valor</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const overdue =
                entry.status === "pending" && entry.dueDate < today;
              return (
                <tr key={entry.id}>
                  <td className={overdue ? "overdue" : ""}>
                    {new Date(`${entry.dueDate}T12:00:00`).toLocaleDateString(
                      "pt-BR",
                    )}
                  </td>
                  <td>
                    <strong>{entry.description}</strong>
                    <small>{entry.category ?? "Sem categoria"}</small>
                  </td>
                  <td>{entry.type === "payable" ? "A pagar" : "A receber"}</td>
                  <td>{formatCurrency(Number(entry.amount))}</td>
                  <td>
                    <span
                      className={
                        entry.status === "paid"
                          ? "sale-ok"
                          : overdue
                            ? "sale-cancelled"
                            : "stock-low"
                      }
                    >
                      {entry.status === "paid"
                        ? "Baixado"
                        : overdue
                          ? "Vencido"
                          : "Pendente"}
                    </span>
                  </td>
                  <td>
                    {entry.status === "pending" && (
                      <button
                        className="table-action"
                        onClick={() => void settle(entry)}
                      >
                        Dar baixa
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!entries.length && (
          <p className="empty-row">Nenhum lançamento encontrado.</p>
        )}
      </section>
    </>
  );
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function Stock({
  token,
  companyId,
  products,
  onChanged,
}: {
  token: string;
  companyId: string;
  products: Product[];
  onChanged: () => void;
}) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementType, setMovementType] = useState<StockMovement["type"]>("in");
  const [feedback, setFeedback] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);

  const loadMovements = useCallback(async () => {
    try {
      setMovements(
        await api<StockMovement[]>(
          `/companies/${companyId}/stock-movements`,
          {},
          token,
        ),
      );
    } catch (reason) {
      setFeedback({
        kind: "error",
        text:
          reason instanceof Error
            ? reason.message
            : "Erro ao carregar histórico.",
      });
    }
  }, [companyId, token]);

  useEffect(() => {
    // Fetch assíncrono necessário ao abrir ou trocar a empresa do inventário.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMovements();
  }, [loadMovements]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await api(
        `/companies/${companyId}/stock-movements`,
        {
          method: "POST",
          body: JSON.stringify({
            productId: data.get("productId"),
            type: data.get("type"),
            quantity: Number(data.get("quantity")),
            reason: data.get("reason") || undefined,
          }),
        },
        token,
      );
      form.reset();
      setMovementType("in");
      setFeedback({
        kind: "success",
        text: "Movimentação armazenada com sucesso.",
      });
      onChanged();
      await loadMovements();
    } catch (reason) {
      setFeedback({
        kind: "error",
        text:
          reason instanceof Error
            ? reason.message
            : "Erro ao movimentar estoque.",
      });
    }
  }

  const productNames = new Map(
    products.map((product) => [product.id, product.name]),
  );
  return (
    <>
      <section className="page-title">
        <div>
          <small>INVENTÁRIO</small>
          <h1>Movimentar estoque</h1>
          <p>Entradas, saídas e ajustes ficam registrados.</p>
        </div>
      </section>
      {feedback && (
        <div
          className={`alert ${feedback.kind === "success" ? "success" : ""}`}
        >
          {feedback.text}
          <button onClick={() => setFeedback(null)}>×</button>
        </div>
      )}
      <section className="panel">
        <form className="stock-form" onSubmit={(event) => void submit(event)}>
          <label>
            Produto
            <select name="productId" required defaultValue="">
              <option value="" disabled>
                Selecione
              </option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} — saldo {Number(product.stockQuantity)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tipo de movimento
            <select
              name="type"
              value={movementType}
              onChange={(event) =>
                setMovementType(event.target.value as StockMovement["type"])
              }
            >
              <option value="in">Entrada</option>
              <option value="out">Saída</option>
              <option value="adjustment">Definir saldo exato</option>
            </select>
          </label>
          <label>
            {movementType === "adjustment"
              ? "Novo saldo disponível"
              : "Quantidade movimentada"}
            <input
              name="quantity"
              type="number"
              step="0.001"
              min="0"
              required
            />
          </label>
          <label>
            Motivo
            <input name="reason" placeholder="Compra, perda, inventário..." />
          </label>
          <button className="primary" disabled={!products.length}>
            Registrar
          </button>
        </form>
      </section>
      <ProductTable products={products} />
      <section className="panel table-panel">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Produto</th>
              <th>Tipo</th>
              <th>Anterior</th>
              <th>Novo saldo</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((movement) => (
              <tr key={movement.id}>
                <td>{new Date(movement.createdAt).toLocaleString("pt-BR")}</td>
                <td>
                  {productNames.get(movement.productId) ?? movement.productId}
                </td>
                <td>
                  {movement.type === "in"
                    ? "Entrada"
                    : movement.type === "out"
                      ? "Saída"
                      : "Ajuste"}
                </td>
                <td>{Number(movement.previousQuantity)}</td>
                <td>
                  <strong>{Number(movement.resultingQuantity)}</strong>
                </td>
                <td>{movement.reason ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {movements.length === 0 && (
          <p className="empty-row">Nenhuma movimentação armazenada.</p>
        )}
      </section>
    </>
  );
}

export default App;
