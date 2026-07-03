import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import type { Product, Purchase, Supplier } from "../../types";

export function Purchases({
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
