import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import type { FinancialEntry, FinanceSummary } from "../../types";

export function Finance({
  token,
  companyId,
}: {
  token: string;
  companyId: string;
}) {
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [filter, setFilter] = useState("all");
  const [feedback, setFeedback] = useState("");

  const loadFinance = useCallback(async () => {
    try {
      const query = filter === "all" ? "" : `?status=${filter}`;
      const [items, totals] = await Promise.all([
        api<FinancialEntry[]>(
          `/companies/${companyId}/finance/entries${query}`,
          {},
          token,
        ),
        api<FinanceSummary>(
          `/companies/${companyId}/finance/summary`,
          {},
          token,
        ),
      ]);
      setEntries(items);
      setSummary(totals);
    } catch (reason) {
      setFeedback(
        reason instanceof Error
          ? reason.message
          : "Erro ao carregar o financeiro.",
      );
    }
  }, [companyId, filter, token]);

  useEffect(() => {
    // Sincroniza a tela financeira com a empresa e o filtro selecionados.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadFinance();
  }, [loadFinance]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await api(
        `/companies/${companyId}/finance/entries`,
        {
          method: "POST",
          body: JSON.stringify({
            type: data.get("type"),
            description: data.get("description"),
            category: data.get("category") || undefined,
            amount: Number(data.get("amount")),
            dueDate: data.get("dueDate"),
          }),
        },
        token,
      );
      form.reset();
      setFeedback("Lançamento criado com sucesso.");
      await loadFinance();
    } catch (reason) {
      setFeedback(
        reason instanceof Error ? reason.message : "Erro ao criar lançamento.",
      );
    }
  }

  async function settle(entry: FinancialEntry) {
    if (!window.confirm(`Confirmar a baixa de ${entry.description}?`)) return;
    try {
      await api(
        `/companies/${companyId}/finance/entries/${entry.id}/settle`,
        { method: "PATCH" },
        token,
      );
      setFeedback("Baixa registrada com sucesso.");
      await loadFinance();
    } catch (reason) {
      setFeedback(
        reason instanceof Error ? reason.message : "Erro ao baixar lançamento.",
      );
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <section className="page-title">
        <div>
          <small>CONTROLE FINANCEIRO</small>
          <h1>Contas a pagar e receber</h1>
          <p>Acompanhe compromissos, recebimentos e vencimentos.</p>
        </div>
      </section>
      {feedback && (
        <div className="alert success">
          {feedback}
          <button onClick={() => setFeedback("")}>×</button>
        </div>
      )}
      {summary && (
        <section className="metrics report-metrics">
          <article className="warning">
            <span>A pagar</span>
            <strong>{formatCurrency(Number(summary.payable.pending))}</strong>
            <small>pendente</small>
          </article>
          <article>
            <span>A receber</span>
            <strong>
              {formatCurrency(Number(summary.receivable.pending))}
            </strong>
            <small>pendente</small>
          </article>
          <article>
            <span>Pagamentos realizados</span>
            <strong>{formatCurrency(Number(summary.payable.paid))}</strong>
            <small>total baixado</small>
          </article>
          <article>
            <span>Recebimentos realizados</span>
            <strong>{formatCurrency(Number(summary.receivable.paid))}</strong>
            <small>total baixado</small>
          </article>
        </section>
      )}
      <section className="panel">
        <h3>Novo lançamento</h3>
        <form className="product-form" onSubmit={(event) => void submit(event)}>
          <label>
            <span>Tipo</span>
            <select name="type">
              <option value="payable">Conta a pagar</option>
              <option value="receivable">Conta a receber</option>
            </select>
          </label>
          <label>
            <span>Descrição</span>
            <input name="description" required minLength={2} />
          </label>
          <label>
            <span>Categoria</span>
            <input
              name="category"
              placeholder="Aluguel, fornecedor, serviço..."
            />
          </label>
          <label>
            <span>Valor</span>
            <input
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              required
            />
          </label>
          <label>
            <span>Vencimento</span>
            <input name="dueDate" type="date" defaultValue={today} required />
          </label>
          <div className="form-actions">
            <button className="primary">Adicionar lançamento</button>
          </div>
        </form>
      </section>
      <section className="panel table-panel">
        <div className="table-heading">
          <h3>Lançamentos</h3>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="all">Todos</option>
            <option value="pending">Pendentes</option>
            <option value="paid">Baixados</option>
          </select>
        </div>
        <table>
          <thead>
            <tr>
              <th>Vencimento</th>
              <th>Descrição</th>
              <th>Tipo</th>
              <th>Valor</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const overdue =
                entry.status === "pending" && entry.dueDate < today;
              return (
                <tr key={entry.id}>
                  <td className={overdue ? "overdue" : ""}>
                    {new Date(`${entry.dueDate}T12:00:00`).toLocaleDateString(
                      "pt-BR",
                    )}
                  </td>
                  <td>
                    <strong>{entry.description}</strong>
                    <small>{entry.category ?? "Sem categoria"}</small>
                  </td>
                  <td>{entry.type === "payable" ? "A pagar" : "A receber"}</td>
                  <td>{formatCurrency(Number(entry.amount))}</td>
                  <td>
                    <span
                      className={
                        entry.status === "paid"
                          ? "sale-ok"
                          : overdue
                            ? "sale-cancelled"
                            : "stock-low"
                      }
                    >
                      {entry.status === "paid"
                        ? "Baixado"
                        : overdue
                          ? "Vencido"
                          : "Pendente"}
                    </span>
                  </td>
                  <td>
                    {entry.status === "pending" && (
                      <button
                        className="table-action"
                        onClick={() => void settle(entry)}
                      >
                        Dar baixa
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!entries.length && (
          <p className="empty-row">Nenhum lançamento encontrado.</p>
        )}
      </section>
    </>
  );
}
