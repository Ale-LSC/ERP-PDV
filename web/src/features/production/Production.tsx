import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../../lib/api";
import type { CompanyModule, Product } from "../../types";

type Bom = {
  id: string;
  name: string;
  productName: string;
  yieldQuantity: string;
  items: Array<{ productName: string; quantity: string }>;
};
type Order = {
  id: string;
  bomName: string;
  productName: string;
  plannedQuantity: string;
  status: string;
};
type Mrp = {
  productId: string;
  productName: string;
  required: string;
  available: string;
  shortage: string;
};

export function Production({
  token,
  companyId,
  module,
  products,
}: {
  token: string;
  companyId: string;
  module: CompanyModule;
  products: Product[];
}) {
  const [boms, setBoms] = useState<Bom[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [mrp, setMrp] = useState<Mrp[]>([]);
  const [feedback, setFeedback] = useState("");
  const [components, setComponents] = useState([
    { productId: "", quantity: 1 },
  ]);
  const load = useCallback(async () => {
    setBoms(await api<Bom[]>(`/companies/${companyId}/boms`, {}, token));
    if (module === "production")
      setOrders(
        await api<Order[]>(
          `/companies/${companyId}/production-orders`,
          {},
          token,
        ),
      );
  }, [companyId, module, token]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch((error: Error) => setFeedback(error.message));
  }, [load]);
  async function createBom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await api(
        `/companies/${companyId}/boms`,
        {
          method: "POST",
          body: JSON.stringify({
            productId: data.get("productId"),
            name: data.get("name"),
            yieldQuantity: Number(data.get("yieldQuantity")),
            items: components,
          }),
        },
        token,
      );
      form.reset();
      setComponents([{ productId: "", quantity: 1 }]);
      await load();
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Erro ao salvar ficha.",
      );
    }
  }
  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await api(
        `/companies/${companyId}/production-orders`,
        {
          method: "POST",
          body: JSON.stringify({
            bomId: data.get("bomId"),
            plannedQuantity: Number(data.get("quantity")),
            notes: data.get("notes") || undefined,
          }),
        },
        token,
      );
      form.reset();
      await load();
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Erro ao criar ordem.",
      );
    }
  }
  async function complete(order: Order) {
    const quantity = window.prompt(
      "Quantidade efetivamente produzida",
      order.plannedQuantity,
    );
    if (!quantity) return;
    try {
      await api(
        `/companies/${companyId}/production-orders/${order.id}/complete`,
        {
          method: "PATCH",
          body: JSON.stringify({ producedQuantity: Number(quantity) }),
        },
        token,
      );
      await load();
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Erro ao concluir ordem.",
      );
    }
  }
  async function calculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      setMrp(
        await api<Mrp[]>(
          `/companies/${companyId}/mrp/${data.get("bomId")}?quantity=${data.get("quantity")}`,
          {},
          token,
        ),
      );
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Erro ao calcular MRP.",
      );
    }
  }
  if (module === "bom")
    return (
      <>
        <Title
          label="ENGENHARIA"
          title="Fichas técnicas"
          text="Defina rendimento e matérias-primas."
        />
        {feedback && <div className="alert">{feedback}</div>}
        <section className="panel">
          <form
            className="product-form"
            onSubmit={(event) => void createBom(event)}
          >
            <label>
              <span>Nome</span>
              <input name="name" required />
            </label>
            <label>
              <span>Produto acabado</span>
              <ProductSelect name="productId" products={products} />
            </label>
            <label>
              <span>Rendimento</span>
              <input
                name="yieldQuantity"
                type="number"
                min="0.001"
                step="0.001"
                required
              />
            </label>
            <button className="primary">Salvar ficha</button>
            {components.map((item, index) => (
              <div className="inline-form" key={index}>
                <ProductSelect
                  products={products}
                  value={item.productId}
                  onChange={(productId) =>
                    setComponents((rows) =>
                      rows.map((row, i) =>
                        i === index ? { ...row, productId } : row,
                      ),
                    )
                  }
                />
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={item.quantity}
                  onChange={(event) =>
                    setComponents((rows) =>
                      rows.map((row, i) =>
                        i === index
                          ? { ...row, quantity: Number(event.target.value) }
                          : row,
                      ),
                    )
                  }
                />
              </div>
            ))}
            <button
              type="button"
              className="secondary"
              onClick={() =>
                setComponents((rows) => [
                  ...rows,
                  { productId: "", quantity: 1 },
                ])
              }
            >
              Adicionar componente
            </button>
          </form>
        </section>
        <BomTable boms={boms} />
      </>
    );
  if (module === "mrp")
    return (
      <>
        <Title
          label="PLANEJAMENTO"
          title="MRP"
          text="Calcule necessidades e faltas por filial."
        />
        <section className="panel">
          <form
            className="inline-form"
            onSubmit={(event) => void calculate(event)}
          >
            <BomSelect boms={boms} />
            <input
              name="quantity"
              type="number"
              min="0.001"
              step="0.001"
              placeholder="Quantidade"
              required
            />
            <button className="primary">Calcular</button>
          </form>
        </section>
        <section className="panel table-panel">
          <table>
            <thead>
              <tr>
                <th>Componente</th>
                <th>Necessário</th>
                <th>Disponível</th>
                <th>Falta</th>
              </tr>
            </thead>
            <tbody>
              {mrp.map((item) => (
                <tr key={item.productId}>
                  <td>{item.productName}</td>
                  <td>{Number(item.required)}</td>
                  <td>{Number(item.available)}</td>
                  <td className={Number(item.shortage) ? "overdue" : ""}>
                    {Number(item.shortage)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </>
    );
  return (
    <>
      <Title
        label="CHÃO DE FÁBRICA"
        title="Ordens de produção"
        text="Baixa automática de insumos e entrada do produto acabado."
      />
      {feedback && <div className="alert">{feedback}</div>}
      <section className="panel">
        <form
          className="product-form"
          onSubmit={(event) => void createOrder(event)}
        >
          <label>
            <span>Ficha</span>
            <BomSelect boms={boms} />
          </label>
          <label>
            <span>Quantidade</span>
            <input
              name="quantity"
              type="number"
              min="0.001"
              step="0.001"
              required
            />
          </label>
          <label>
            <span>Observações</span>
            <input name="notes" />
          </label>
          <button className="primary">Criar ordem</button>
        </form>
      </section>
      <section className="panel table-panel">
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Ficha</th>
              <th>Planejado</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.productName}</td>
                <td>{order.bomName}</td>
                <td>{Number(order.plannedQuantity)}</td>
                <td>{order.status}</td>
                <td>
                  {order.status !== "completed" && (
                    <button
                      className="primary"
                      onClick={() => void complete(order)}
                    >
                      Concluir
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
function Title({
  label,
  title,
  text,
}: {
  label: string;
  title: string;
  text: string;
}) {
  return (
    <section className="page-title">
      <div>
        <small>{label}</small>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
    </section>
  );
}
function ProductSelect({
  products,
  name,
  value,
  onChange,
}: {
  products: Product[];
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <select
      name={name}
      value={onChange ? value : undefined}
      defaultValue={onChange ? undefined : ""}
      onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      required
    >
      <option value="" disabled>
        Selecione
      </option>
      {products.map((item) => (
        <option value={item.id} key={item.id}>
          {item.name}
        </option>
      ))}
    </select>
  );
}
function BomSelect({ boms }: { boms: Bom[] }) {
  return (
    <select name="bomId" required defaultValue="">
      <option value="" disabled>
        Selecione
      </option>
      {boms.map((bom) => (
        <option key={bom.id} value={bom.id}>
          {bom.name} — {bom.productName}
        </option>
      ))}
    </select>
  );
}
function BomTable({ boms }: { boms: Bom[] }) {
  return (
    <section className="panel table-panel">
      <table>
        <thead>
          <tr>
            <th>Ficha</th>
            <th>Produto</th>
            <th>Rendimento</th>
            <th>Componentes</th>
          </tr>
        </thead>
        <tbody>
          {boms.map((bom) => (
            <tr key={bom.id}>
              <td>{bom.name}</td>
              <td>{bom.productName}</td>
              <td>{Number(bom.yieldQuantity)}</td>
              <td>
                {bom.items
                  .map(
                    (item) => `${item.productName}: ${Number(item.quantity)}`,
                  )
                  .join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
