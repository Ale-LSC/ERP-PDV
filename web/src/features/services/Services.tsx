import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import type { CompanyModule, Customer } from "../../types";

type Row = {
  id: string;
  title: string;
  customerName: string | null;
  status: string;
  amount?: string;
  scheduledAt?: string | null;
  startsAt?: string;
  endsAt?: string;
  billingCycle?: string;
  startsOn?: string;
  endsOn?: string | null;
};
const endpoints = {
  service_orders: "service-orders",
  appointments: "appointments",
  contracts: "service-contracts",
} as const;

export function Services({
  token,
  companyId,
  module,
  customers,
}: {
  token: string;
  companyId: string;
  module: CompanyModule;
  customers: Customer[];
}) {
  const endpoint = endpoints[module as keyof typeof endpoints];
  const [rows, setRows] = useState<Row[]>([]);
  const [feedback, setFeedback] = useState("");
  const load = useCallback(
    async () =>
      setRows(
        await api<Row[]>(`/companies/${companyId}/${endpoint}`, {}, token),
      ),
    [companyId, endpoint, token],
  );
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch((error: Error) => setFeedback(error.message));
  }, [load]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const body =
      module === "service_orders"
        ? {
            customerId: data.get("customerId"),
            title: data.get("title"),
            description: data.get("notes") || undefined,
            amount: Number(data.get("amount")),
            scheduledAt: data.get("startsAt") || undefined,
          }
        : module === "appointments"
          ? {
              customerId: data.get("customerId") || undefined,
              title: data.get("title"),
              startsAt: data.get("startsAt"),
              endsAt: data.get("endsAt"),
              notes: data.get("notes") || undefined,
            }
          : {
              customerId: data.get("customerId"),
              title: data.get("title"),
              amount: Number(data.get("amount")),
              billingCycle: data.get("billingCycle"),
              startsOn: data.get("startsOn"),
              endsOn: data.get("endsOn") || undefined,
              notes: data.get("notes") || undefined,
            };
    try {
      await api(
        `/companies/${companyId}/${endpoint}`,
        { method: "POST", body: JSON.stringify(body) },
        token,
      );
      form.reset();
      setFeedback("Registro criado.");
      await load();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro ao salvar.");
    }
  }
  async function status(id: string, value: string) {
    try {
      await api(
        `/companies/${companyId}/${endpoint}/${id}/status`,
        { method: "PATCH", body: JSON.stringify({ status: value }) },
        token,
      );
      await load();
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Erro ao atualizar.",
      );
    }
  }
  const title =
    module === "service_orders"
      ? "Ordens de serviço"
      : module === "appointments"
        ? "Agenda"
        : "Contratos";
  return (
    <>
      <section className="page-title">
        <div>
          <small>SERVIÇOS</small>
          <h1>{title}</h1>
          <p>
            {module === "service_orders"
              ? "Atendimento, execução e faturamento integrado."
              : module === "appointments"
                ? "Organize horários sem sobreposição."
                : "Gerencie vigência e recorrência comercial."}
          </p>
        </div>
      </section>
      {feedback && <div className="alert success">{feedback}</div>}
      <section className="panel">
        <form className="product-form" onSubmit={(event) => void submit(event)}>
          <label>
            <span>Título</span>
            <input name="title" required />
          </label>
          <label>
            <span>Cliente</span>
            <select
              name="customerId"
              required={module !== "appointments"}
              defaultValue=""
            >
              <option value="">
                {module === "appointments" ? "Sem cliente" : "Selecione"}
              </option>
              {customers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          {module !== "appointments" && (
            <label>
              <span>Valor</span>
              <input
                name="amount"
                type="number"
                min={module === "contracts" ? "0.01" : "0"}
                step="0.01"
                required
              />
            </label>
          )}
          {module === "contracts" ? (
            <>
              <label>
                <span>Ciclo</span>
                <select name="billingCycle">
                  <option value="monthly">Mensal</option>
                  <option value="quarterly">Trimestral</option>
                  <option value="annual">Anual</option>
                </select>
              </label>
              <label>
                <span>Início</span>
                <input name="startsOn" type="date" required />
              </label>
              <label>
                <span>Fim</span>
                <input name="endsOn" type="date" />
              </label>
            </>
          ) : (
            <>
              <label>
                <span>Início</span>
                <input
                  name="startsAt"
                  type="datetime-local"
                  required={module === "appointments"}
                />
              </label>
              {module === "appointments" && (
                <label>
                  <span>Término</span>
                  <input name="endsAt" type="datetime-local" required />
                </label>
              )}
            </>
          )}
          <label>
            <span>Observações</span>
            <input name="notes" />
          </label>
          <button className="primary">Adicionar</button>
        </form>
      </section>
      <section className="panel table-panel">
        <table>
          <thead>
            <tr>
              <th>Registro</th>
              <th>Cliente</th>
              <th>Período/valor</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.title}</td>
                <td>{row.customerName ?? "—"}</td>
                <td>
                  {row.amount
                    ? formatCurrency(Number(row.amount))
                    : row.startsAt
                      ? `${new Date(row.startsAt).toLocaleString("pt-BR")} — ${new Date(row.endsAt!).toLocaleString("pt-BR")}`
                      : row.scheduledAt
                        ? new Date(row.scheduledAt).toLocaleString("pt-BR")
                        : `${row.startsOn ?? ""}${row.endsOn ? ` — ${row.endsOn}` : ""}`}
                </td>
                <td>
                  <StatusSelect
                    module={module}
                    value={row.status}
                    onChange={(value) => void status(row.id, value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="empty-row">Nenhum registro.</p>}
      </section>
    </>
  );
}
function StatusSelect({
  module,
  value,
  onChange,
}: {
  module: CompanyModule;
  value: string;
  onChange: (value: string) => void;
}) {
  const options =
    module === "service_orders"
      ? [
          ["open", "Aberta"],
          ["in_progress", "Em andamento"],
          ["completed", "Concluída"],
          ["cancelled", "Cancelada"],
        ]
      : module === "appointments"
        ? [
            ["scheduled", "Agendado"],
            ["confirmed", "Confirmado"],
            ["completed", "Concluído"],
            ["cancelled", "Cancelado"],
          ]
        : [
            ["draft", "Rascunho"],
            ["active", "Ativo"],
            ["suspended", "Suspenso"],
            ["ended", "Encerrado"],
          ];
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map(([key, label]) => (
        <option value={key} key={key}>
          {label}
        </option>
      ))}
    </select>
  );
}
