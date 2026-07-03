import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../../lib/api";
import { moduleLabels } from "../../lib/company-modules";
import type { CompanyModule, ModuleRecord } from "../../types";

const statusLabels: Record<ModuleRecord["status"], string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export function ModuleWorkspace({
  token,
  companyId,
  module,
}: {
  token: string;
  companyId: string;
  module: CompanyModule;
}) {
  const [records, setRecords] = useState<ModuleRecord[]>([]);
  const [feedback, setFeedback] = useState("");

  const load = useCallback(async () => {
    setRecords(
      await api<ModuleRecord[]>(
        `/companies/${companyId}/modules/${module}/records`,
        {},
        token,
      ),
    );
  }, [companyId, module, token]);

  useEffect(() => {
    // Carrega os registros ao abrir ou trocar o módulo.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch((reason: Error) => setFeedback(reason.message));
  }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await api(
        `/companies/${companyId}/modules/${module}/records`,
        {
          method: "POST",
          body: JSON.stringify({
            title: data.get("title"),
            description: data.get("description") || undefined,
            dueAt: data.get("dueAt") || undefined,
          }),
        },
        token,
      );
      form.reset();
      setFeedback("Registro criado.");
      await load();
    } catch (reason) {
      setFeedback(
        reason instanceof Error ? reason.message : "Erro ao criar registro.",
      );
    }
  }

  async function changeStatus(
    record: ModuleRecord,
    status: ModuleRecord["status"],
  ) {
    try {
      await api(
        `/companies/${companyId}/modules/${module}/records/${record.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        },
        token,
      );
      await load();
    } catch (reason) {
      setFeedback(
        reason instanceof Error
          ? reason.message
          : "Erro ao atualizar registro.",
      );
    }
  }

  return (
    <>
      <section className="page-title">
        <div>
          <small>MÓDULO OPERACIONAL</small>
          <h1>{moduleLabels[module]}</h1>
          <p>Organize atividades, prazos e andamento deste módulo.</p>
        </div>
      </section>
      {feedback && <div className="alert success">{feedback}</div>}
      <section className="panel">
        <h3>Novo registro</h3>
        <form className="product-form" onSubmit={(event) => void create(event)}>
          <label>
            <span>Título</span>
            <input name="title" minLength={2} required />
          </label>
          <label>
            <span>Prazo</span>
            <input name="dueAt" type="datetime-local" />
          </label>
          <label>
            <span>Descrição</span>
            <input name="description" />
          </label>
          <div className="form-actions">
            <button className="primary">Adicionar</button>
          </div>
        </form>
      </section>
      <section className="panel table-panel">
        <table>
          <thead>
            <tr>
              <th>Registro</th>
              <th>Prazo</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id}>
                <td>
                  <strong>{record.title}</strong>
                  <small>{record.description ?? "Sem descrição"}</small>
                </td>
                <td>
                  {record.dueAt
                    ? new Date(record.dueAt).toLocaleString("pt-BR")
                    : "—"}
                </td>
                <td>
                  <select
                    value={record.status}
                    onChange={(event) =>
                      void changeStatus(
                        record,
                        event.target.value as ModuleRecord["status"],
                      )
                    }
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!records.length && (
          <p className="empty-row">Nenhum registro neste módulo.</p>
        )}
      </section>
    </>
  );
}
