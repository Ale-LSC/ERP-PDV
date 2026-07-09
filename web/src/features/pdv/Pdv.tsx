import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { api } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import type {
  CashSession,
  CashSummary,
  CartItem,
  Customer,
  Product,
  Sale,
  SaleReceipt,
} from "../../types";

export function Pdv({
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
      total +
      Math.round(
        Number(item.product.effectivePrice ?? item.product.salePrice) *
          100 *
          item.quantity,
      ),
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
  async function requestRestock(product: Product) {
    const value = window.prompt(
      `Quantidade solicitada para ${product.name}:`,
      "1",
    );
    if (!value) return;
    try {
      await api(
        `/companies/${companyId}/replenishment-requests`,
        {
          method: "POST",
          body: JSON.stringify({
            productId: product.id,
            quantity: Number(value),
            note: "Solicitado pelo PDV",
          }),
        },
        token,
      );
      setFeedback({ kind: "success", text: "Solicitação enviada ao estoque." });
    } catch (reason) {
      setFeedback({
        kind: "error",
        text:
          reason instanceof Error
            ? reason.message
            : "Erro ao solicitar reposição.",
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
                <span>
                  {formatCurrency(
                    Number(product.effectivePrice ?? product.salePrice),
                  )}
                </span>
                <em>Saldo {Number(product.stockQuantity)}</em>
              </button>
            ))}
            {!filteredProducts.length && (
              <p className="empty-row">Nenhum produto disponível.</p>
            )}
          </div>
          {products.some(
            (product) =>
              Number(product.stockQuantity) <= Number(product.minimumStock),
          ) && (
            <div className="restock-shortcuts">
              <h4>Reposição necessária</h4>
              {products
                .filter(
                  (product) =>
                    Number(product.stockQuantity) <=
                    Number(product.minimumStock),
                )
                .slice(0, 8)
                .map((product) => (
                  <button
                    key={product.id}
                    className="secondary"
                    onClick={() => void requestRestock(product)}
                  >
                    Solicitar {product.name}
                  </button>
                ))}
            </div>
          )}
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
                    {formatCurrency(
                      Number(
                        item.product.effectivePrice ?? item.product.salePrice,
                      ),
                    )}
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
                    Number(
                      item.product.effectivePrice ?? item.product.salePrice,
                    ) * item.quantity,
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
