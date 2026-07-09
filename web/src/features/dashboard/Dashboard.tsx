import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import {
  enabledModules,
  moduleLabels,
  segmentLabels,
} from "../../lib/company-modules";
import { formatCurrency } from "../../lib/format";
import type { CompanyModule, Product, ReportOverview } from "../../types";

export function Dashboard({
  token,
  companyId,
  companyRole,
  companySegment,
  modules,
  products,
  lowStock,
}: {
  token: string;
  companyId: string;
  companyRole: string;
  companySegment: string;
  modules?: CompanyModule[];
  products: Product[];
  lowStock: number;
}) {
  const today = new Date();
  const [from, setFrom] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`,
  );
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [report, setReport] = useState<ReportOverview | null>(null);
  const [reportError, setReportError] = useState("");
  const stockValue = products.reduce(
    (sum, product) =>
      sum + Number(product.salePrice) * Number(product.stockQuantity),
    0,
  );
  const activeModules = enabledModules(modules);
  const futureModules = activeModules.filter(
    (module) =>
      ![
        "dashboard",
        "team",
        "customers",
        "products",
        "inventory",
        "purchases",
        "finance",
        "pdv",
        "cash",
        "reports",
      ].includes(module),
  );

  const loadReport = useCallback(async () => {
    if (companyRole === "cashier") return;
    try {
      setReport(
        await api<ReportOverview>(
          `/companies/${companyId}/reports/overview?from=${from}&to=${to}`,
          {},
          token,
        ),
      );
      setReportError("");
    } catch (reason) {
      setReportError(
        reason instanceof Error
          ? reason.message
          : "Erro ao carregar relatório.",
      );
    }
  }, [companyId, companyRole, from, to, token]);

  useEffect(() => {
    // Atualiza o relatório ao trocar empresa ou período.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadReport();
  }, [loadReport]);

  return (
    <>
      <section className="page-title">
        <div>
          <small>PAINEL</small>
          <h1>Visão geral</h1>
          <p>Um retrato rápido da sua operação.</p>
        </div>
      </section>
      <section className="metrics">
        <article>
          <span>Produtos ativos</span>
          <strong>{products.length}</strong>
          <small>itens cadastrados</small>
        </article>
        <article>
          <span>Valor em estoque</span>
          <strong>
            {stockValue.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </strong>
          <small>pelo preço de venda</small>
        </article>
        <article className={lowStock ? "warning" : ""}>
          <span>Estoque baixo</span>
          <strong>{lowStock}</strong>
          <small>itens pedindo atenção</small>
        </article>
        <article>
          <span>Perfil operacional</span>
          <strong>{segmentLabels[companySegment] ?? "ERP"}</strong>
          <small>{activeModules.length} módulos habilitados</small>
        </article>
      </section>
      <section className="panel">
        <div className="table-heading">
          <div>
            <h3>Módulos habilitados</h3>
            <small>Menus e fluxos agora seguem o segmento da empresa</small>
          </div>
        </div>
        <div className="roadmap">
          {activeModules.map((module) => (
            <span
              className={futureModules.includes(module) ? "stock-low" : "done"}
              key={module}
            >
              {futureModules.includes(module) ? "•" : "✓"}{" "}
              {moduleLabels[module]}
            </span>
          ))}
        </div>
      </section>
      {companyRole !== "cashier" && (
        <section className="panel">
          <div className="table-heading">
            <div>
              <h3>Desempenho do período</h3>
              <small>Somente vendas concluídas</small>
            </div>
            <div className="report-filters">
              <input
                aria-label="Data inicial"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
              <input
                aria-label="Data final"
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </div>
          </div>
          {reportError && <div className="alert">{reportError}</div>}
          {report && (
            <>
              <section className="metrics report-metrics">
                <article>
                  <span>Faturamento</span>
                  <strong>
                    {formatCurrency(Number(report.sales.revenue))}
                  </strong>
                  <small>{report.sales.count} vendas</small>
                </article>
                <article>
                  <span>Ticket médio</span>
                  <strong>
                    {formatCurrency(Number(report.sales.averageTicket))}
                  </strong>
                  <small>por venda concluída</small>
                </article>
                <article>
                  <span>Descontos</span>
                  <strong>
                    {formatCurrency(Number(report.sales.discounts))}
                  </strong>
                  <small>concedidos no período</small>
                </article>
                <article>
                  <span>Clientes</span>
                  <strong>{report.customersCount}</strong>
                  <small>cadastros ativos</small>
                </article>
              </section>
              <div className="report-grid">
                <div>
                  <h3>Formas de pagamento</h3>
                  <ul className="report-list">
                    <li>
                      <span>Dinheiro</span>
                      <strong>
                        {formatCurrency(Number(report.payments.cash))}
                      </strong>
                    </li>
                    <li>
                      <span>Pix</span>
                      <strong>
                        {formatCurrency(Number(report.payments.pix))}
                      </strong>
                    </li>
                    <li>
                      <span>Débito</span>
                      <strong>
                        {formatCurrency(Number(report.payments.debit_card))}
                      </strong>
                    </li>
                    <li>
                      <span>Crédito</span>
                      <strong>
                        {formatCurrency(Number(report.payments.credit_card))}
                      </strong>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3>Produtos mais vendidos</h3>
                  <ul className="report-list">
                    {report.topProducts.map((product) => (
                      <li key={product.productId}>
                        <span>
                          {product.name}
                          <small>{Number(product.quantity)} un.</small>
                        </span>
                        <strong>
                          {formatCurrency(Number(product.revenue))}
                        </strong>
                      </li>
                    ))}
                    {!report.topProducts.length && (
                      <li>
                        <span>Nenhuma venda no período.</span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </>
          )}
        </section>
      )}
      <section className="panel">
        <h3>Próximos passos</h3>
        <div className="roadmap">
          <span className="done">✓ Produtos e estoque</span>
          <span className="done">✓ Caixa e vendas</span>
          <span className="done">✓ Clientes</span>
          <span className="done">✓ Relatórios</span>
        </div>
      </section>
    </>
  );
}
