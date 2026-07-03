import { useState, type FormEvent } from "react";
import { api } from "../../lib/api";
import type { Product } from "../../types";

export function Products({
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

export function ProductTable({
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
