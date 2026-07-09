import { useState, type FormEvent } from "react";
import { api } from "../../lib/api";
import type { Customer } from "../../types";

export function Customers({
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
