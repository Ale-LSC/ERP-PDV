import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import type { Product } from "../../types";

type Promotion = {
  id: string;
  productName: string;
  name: string;
  promotionalPrice: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

export function Promotions({
  token,
  companyId,
  products,
}: {
  token: string;
  companyId: string;
  products: Product[];
}) {
  const [items, setItems] = useState<Promotion[]>([]);
  const [feedback, setFeedback] = useState("");
  const load = useCallback(
    async () =>
      setItems(
        await api<Promotion[]>(`/companies/${companyId}/promotions`, {}, token),
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
        `/companies/${companyId}/promotions`,
        {
          method: "POST",
          body: JSON.stringify({
            productId: data.get("productId"),
            name: data.get("name"),
            promotionalPrice: Number(data.get("price")),
            startsAt: data.get("startsAt"),
            endsAt: data.get("endsAt"),
          }),
        },
        token,
      );
      form.reset();
      setFeedback("Promoção criada.");
      await load();
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Erro ao criar promoção.",
      );
    }
  }
  async function deactivate(id: string) {
    await api(
      `/companies/${companyId}/promotions/${id}/deactivate`,
      { method: "PATCH" },
      token,
    );
    await load();
  }
  return (
    <>
      <section className="page-title">
        <div>
          <small>COMERCIAL</small>
          <h1>Promoções</h1>
          <p>Preços programados são aplicados automaticamente no PDV.</p>
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
            <span>Nome</span>
            <input name="name" required />
          </label>
          <label>
            <span>Preço promocional</span>
            <input name="price" type="number" min="0" step="0.01" required />
          </label>
          <label>
            <span>Início</span>
            <input name="startsAt" type="datetime-local" required />
          </label>
          <label>
            <span>Fim</span>
            <input name="endsAt" type="datetime-local" required />
          </label>
          <button className="primary">Criar promoção</button>
        </form>
      </section>
      <section className="panel table-panel">
        <table>
          <thead>
            <tr>
              <th>Promoção</th>
              <th>Produto</th>
              <th>Preço</th>
              <th>Período</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.productName}</td>
                <td>{formatCurrency(Number(item.promotionalPrice))}</td>
                <td>
                  {new Date(item.startsAt).toLocaleString("pt-BR")} —{" "}
                  {new Date(item.endsAt).toLocaleString("pt-BR")}
                </td>
                <td>
                  {item.isActive && (
                    <button
                      className="danger-action"
                      onClick={() => void deactivate(item.id)}
                    >
                      Desativar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
