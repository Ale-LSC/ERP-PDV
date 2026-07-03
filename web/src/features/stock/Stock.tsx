import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../../lib/api";
import { ProductTable } from "../products/Products";
import type { Product, ReplenishmentRequest, StockMovement } from "../../types";

export function Stock({
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
  const [requests, setRequests] = useState<ReplenishmentRequest[]>([]);
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
      setRequests(
        await api<ReplenishmentRequest[]>(
          `/companies/${companyId}/replenishment-requests`,
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

  async function fulfillRequest(id: string) {
    try {
      await api(
        `/companies/${companyId}/replenishment-requests/${id}/fulfill`,
        { method: "PATCH" },
        token,
      );
      setFeedback({
        kind: "success",
        text: "Solicitação marcada como atendida.",
      });
      await loadMovements();
    } catch (reason) {
      setFeedback({
        kind: "error",
        text:
          reason instanceof Error
            ? reason.message
            : "Erro ao atender solicitação.",
      });
    }
  }

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
        <h3>Solicitações do PDV</h3>
        <div className="request-list">
          {requests
            .filter((request) => request.status === "pending")
            .map((request) => (
              <article key={request.id}>
                <div>
                  <strong>{request.productName}</strong>
                  <small>
                    {Number(request.quantity)} solicitado por{" "}
                    {request.requestedByName}
                  </small>
                </div>
                <button
                  className="primary"
                  onClick={() => void fulfillRequest(request.id)}
                >
                  Atendida
                </button>
              </article>
            ))}
          {!requests.some((request) => request.status === "pending") && (
            <p className="empty-row">Nenhuma solicitação pendente.</p>
          )}
        </div>
      </section>
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
