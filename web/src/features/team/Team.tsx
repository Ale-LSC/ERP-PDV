import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../../lib/api";
import type { Branch, Employee } from "../../types";

export function Team({
  token,
  companyId,
}: {
  token: string;
  companyId: string;
}) {
  const [members, setMembers] = useState<Employee[]>([]);
  const [feedback, setFeedback] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employeeModal, setEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const load = useCallback(async () => {
    const [memberRows, branchRows] = await Promise.all([
      api<Employee[]>(`/companies/${companyId}/employees`, {}, token),
      api<Branch[]>(`/companies/${companyId}/branches`, {}, token),
    ]);
    setMembers(memberRows);
    setBranches(branchRows);
  }, [companyId, token]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch((reason: Error) => setFeedback(reason.message));
  }, [load]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await api(
        editingEmployee
          ? `/companies/${companyId}/employees/${editingEmployee.id}`
          : `/companies/${companyId}/employees`,
        {
          method: editingEmployee ? "PATCH" : "POST",
          body: JSON.stringify({
            name: data.get("name"),
            ...(editingEmployee
              ? {}
              : { email: data.get("email"), password: data.get("password") }),
            role: data.get("role"),
            branchId: data.get("branchId") || undefined,
            ...(editingEmployee
              ? { isActive: data.get("isActive") === "true" }
              : {}),
          }),
        },
        token,
      );
      form.reset();
      setEmployeeModal(false);
      setEditingEmployee(null);
      setFeedback(
        editingEmployee
          ? "Funcionário atualizado."
          : "Funcionário cadastrado e acesso configurado.",
      );
      await load();
    } catch (reason) {
      setFeedback(
        reason instanceof Error ? reason.message : "Erro ao atualizar equipe.",
      );
    }
  }
  async function createBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await api(
        `/companies/${companyId}/branches`,
        {
          method: "POST",
          body: JSON.stringify({
            name: data.get("name"),
            code: data.get("code"),
            address: data.get("address") || undefined,
          }),
        },
        token,
      );
      form.reset();
      setFeedback("Filial criada.");
      await load();
    } catch (reason) {
      setFeedback(
        reason instanceof Error ? reason.message : "Erro ao criar filial.",
      );
    }
  }
  const labels: Record<string, string> = {
    owner: "Dono",
    admin: "Administrador",
    finance: "Financeiro",
    stock: "Estoque",
    cashier: "Operador de PDV",
  };
  return (
    <>
      <section className="page-title">
        <div>
          <small>ACESSOS</small>
          <h1>Funcionários</h1>
          <p>Cadastre a equipe e defina a área inicial de cada pessoa.</p>
        </div>
        <button
          className="primary"
          onClick={() => {
            setEditingEmployee(null);
            setEmployeeModal(true);
          }}
        >
          + Novo funcionário
        </button>
      </section>
      {feedback && (
        <div className="alert success">
          {feedback}
          <button onClick={() => setFeedback("")}>×</button>
        </div>
      )}
      <section className="panel">
        <h3>Filiais</h3>
        <form
          className="inline-form"
          onSubmit={(event) => void createBranch(event)}
        >
          <input name="name" placeholder="Nome da filial" required />
          <input name="code" placeholder="Código (LOJA02)" required />
          <input name="address" placeholder="Endereço" />
          <button className="primary">Criar filial</button>
        </form>
        <div className="roadmap">
          {branches.map((branch) => (
            <span
              className={branch.isHeadquarters ? "done" : ""}
              key={branch.id}
            >
              {branch.name} · {branch.code}
            </span>
          ))}
        </div>
      </section>
      <section className="panel table-panel">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Função</th>
              <th>Filial</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td>{member.name}</td>
                <td>{member.email}</td>
                <td>{labels[member.role] ?? member.role}</td>
                <td>
                  {member.branches.map((branch) => branch.name).join(", ") ||
                    "—"}
                </td>
                <td>
                  <span
                    className={member.isActive ? "sale-ok" : "sale-cancelled"}
                  >
                    {member.isActive ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td>
                  <button
                    className="table-action"
                    onClick={() => {
                      setEditingEmployee(member);
                      setEmployeeModal(true);
                    }}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {employeeModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <section
            className="modal-card"
            key={editingEmployee?.id ?? "new-employee"}
          >
            <div className="modal-heading">
              <div>
                <small>
                  {editingEmployee ? "EDITAR ACESSO" : "NOVO ACESSO"}
                </small>
                <h2>
                  {editingEmployee
                    ? editingEmployee.name
                    : "Cadastrar funcionário"}
                </h2>
              </div>
              <button
                className="modal-close"
                onClick={() => {
                  setEmployeeModal(false);
                  setEditingEmployee(null);
                }}
              >
                ×
              </button>
            </div>
            <form
              className="modal-form"
              onSubmit={(event) => void submit(event)}
            >
              <label>
                Nome
                <input
                  name="name"
                  required
                  minLength={2}
                  autoFocus
                  defaultValue={editingEmployee?.name}
                />
              </label>
              {!editingEmployee && (
                <label>
                  E-mail
                  <input name="email" type="email" required />
                </label>
              )}
              {!editingEmployee && (
                <label>
                  Senha inicial
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={8}
                  />
                </label>
              )}
              <label>
                Função
                <select
                  name="role"
                  defaultValue={editingEmployee?.role ?? "cashier"}
                >
                  <option value="admin">Administrador</option>
                  <option value="finance">Financeiro</option>
                  <option value="stock">Estoque</option>
                  <option value="cashier">Operador de PDV</option>
                  <option value="owner">Dono</option>
                </select>
              </label>
              <label>
                Filial
                <select
                  name="branchId"
                  defaultValue={
                    editingEmployee?.branches[0]?.id ??
                    branches.find((branch) => branch.isHeadquarters)?.id ??
                    ""
                  }
                >
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
              {editingEmployee && (
                <label>
                  Status
                  <select
                    name="isActive"
                    defaultValue={String(editingEmployee.isActive)}
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </label>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setEmployeeModal(false);
                    setEditingEmployee(null);
                  }}
                >
                  Cancelar
                </button>
                <button className="primary">
                  {editingEmployee
                    ? "Salvar alterações"
                    : "Cadastrar funcionário"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
