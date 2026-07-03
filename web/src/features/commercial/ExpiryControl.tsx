import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../../lib/api";
import type { Product } from "../../types";

type ProductLot = {
  id: string;
  productName: string;
  code: string;
  expiresAt: string;
  quantity: string;
};

export function ExpiryControl({
  token,
  companyId,
  products,
}: {
  token: string;
  companyId: string;
  products: Product[];
}) {
  const [lots, setLots] = useState<ProductLot[]>([]);
  const [feedback, setFeedback] = useState("");
  const load = useCallback(
    async () =>
      setLots(
        await api<ProductLot[]>(
          `/companies/${companyId}/product-lots`,
          {},
          token,
        ),
      ),
    [companyId, token],
  );
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch((error: Error) => setFeedback(error.message));
  }, [load]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await api(
        `/companies/${companyId}/product-lots`,
        {
          method: "POST",
          body: JSON.stringify({
            productId: data.get("productId"),
            code: data.get("code"),
            expiresAt: data.get("expiresAt"),
            quantity: Number(data.get("quantity")),
          }),
        },
        token,
      );
      form.reset();
      setFeedback("Lote cadastrado.");
      await load();
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Erro ao cadastrar lote.",
      );
    }
  }
  const today = new Date().toISOString().slice(0, 10);
  const warning = new Date();
  warning.setDate(warning.getDate() + 30);
  const warningDate = warning.toISOString().slice(0, 10);
  return (
    <>
      <section className="page-title">
        <div>
          <small>RASTREABILIDADE</small>
          <h1>Lotes e validades</h1>
          <p>Itens vencidos ou próximos do vencimento ficam destacados.</p>
        </div>
      </section>
      {feedback && <div className="alert success">{feedback}</div>}
      <section className="panel">
        <form className="product-form" onSubmit={(event) => void submit(event)}>
          <label>
            <span>Produto</span>
            <select name="productId" required defaultValue="">
              <option value="" disabled>
                Selecione
              </option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Lote</span>
            <input name="code" required />
          </label>
          <label>
            <span>Validade</span>
            <input name="expiresAt" type="date" required />
          </label>
          <label>
            <span>Quantidade</span>
            <input
              name="quantity"
              type="number"
              min="0"
              step="0.001"
              required
            />
          </label>
          <button className="primary">Cadastrar lote</button>
        </form>
      </section>
      <section className="panel table-panel">
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Lote</th>
              <th>Validade</th>
              <th>Quantidade</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {lots.map((lot) => {
              const status =
                lot.expiresAt < today
                  ? "Vencido"
                  : lot.expiresAt <= warningDate
                    ? "Vence em até 30 dias"
                    : "Regular";
              return (
                <tr key={lot.id}>
                  <td>{lot.productName}</td>
                  <td>{lot.code}</td>
                  <td>
                    {new Date(`${lot.expiresAt}T12:00:00`).toLocaleDateString(
                      "pt-BR",
                    )}
                  </td>
                  <td>{Number(lot.quantity)}</td>
                  <td>
                    <span
                      className={
                        status === "Regular" ? "sale-ok" : "sale-cancelled"
                      }
                    >
                      {status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
