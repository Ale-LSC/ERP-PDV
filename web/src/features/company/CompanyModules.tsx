import { useState } from "react";
import { api } from "../../lib/api";
import { allCompanyModules, moduleLabels } from "../../lib/company-modules";
import type { CompanyModule } from "../../types";

export function CompanyModules({
  token,
  companyId,
  modules,
  onChanged,
}: {
  token: string;
  companyId: string;
  modules?: CompanyModule[];
  onChanged: (modules: CompanyModule[]) => void;
}) {
  const [selected, setSelected] = useState<CompanyModule[]>(modules ?? []);
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  function toggle(module: CompanyModule) {
    setSelected((current) =>
      current.includes(module)
        ? current.filter((item) => item !== module)
        : [...current, module],
    );
  }

  async function save() {
    setSaving(true);
    try {
      const rows = await api<Array<{ module: CompanyModule }>>(
        `/companies/${companyId}/modules`,
        { method: "PATCH", body: JSON.stringify({ modules: selected }) },
        token,
      );
      const updated = rows.map((row) => row.module);
      onChanged(updated);
      setSelected(updated);
      setFeedback("Módulos atualizados.");
    } catch (reason) {
      setFeedback(
        reason instanceof Error ? reason.message : "Erro ao salvar módulos.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="page-title">
        <div>
          <small>CONFIGURAÇÃO</small>
          <h1>Módulos da empresa</h1>
          <p>Defina quais áreas operacionais ficam disponíveis.</p>
        </div>
        <button
          className="primary"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? "Salvando..." : "Salvar módulos"}
        </button>
      </section>
      {feedback && <div className="alert success">{feedback}</div>}
      <section className="panel">
        <div className="roadmap module-settings">
          {allCompanyModules.map((module) => (
            <label
              key={module}
              className={selected.includes(module) ? "done" : ""}
            >
              <input
                type="checkbox"
                checked={selected.includes(module)}
                onChange={() => toggle(module)}
              />
              {moduleLabels[module]}
            </label>
          ))}
        </div>
      </section>
    </>
  );
}
