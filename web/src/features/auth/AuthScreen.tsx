import { useState, type FormEvent } from "react";
import { api } from "../../lib/api";

export function AuthScreen({
  onAuthenticated,
}: {
  onAuthenticated: (token: string) => void;
}) {
  const [register, setRegister] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email"));
    const password = String(data.get("password"));
    try {
      if (register) {
        await api("/onboarding", {
          method: "POST",
          body: JSON.stringify({
            adminName: data.get("name"),
            adminEmail: email,
            password,
            companyName: data.get("companyName"),
            document: data.get("document") || undefined,
            segment: data.get("segment"),
            size: data.get("size"),
          }),
        });
      }
      const result = await api<{ accessToken: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onAuthenticated(result.accessToken);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Erro ao autenticar.",
      );
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-hero">
        <div className="brand light">
          <span>EP</span>
          <strong>ERP PDV</strong>
        </div>
        <div>
          <p>Gestão simples. Venda rápida.</p>
          <h1>Seu negócio inteiro, em um só lugar.</h1>
        </div>
      </section>
      <section className="auth-panel">
        <form className={register ? "onboarding-form" : ""} onSubmit={submit}>
          <div>
            <small>BEM-VINDO</small>
            <h2>{register ? "Crie sua matriz" : "Acesse sua operação"}</h2>
            {register && (
              <p className="onboarding-flow">
                Matriz → Filiais → Administradores → Funcionários
              </p>
            )}
          </div>
          {error && <div className="alert">{error}</div>}
          {register && (
            <label>
              Nome do administrador principal
              <input name="name" required minLength={2} />
            </label>
          )}
          <label>
            E-mail
            <input name="email" type="email" required />
          </label>
          <label>
            Senha
            <input name="password" type="password" required minLength={8} />
          </label>
          {register && (
            <div className="onboarding-company">
              <h3>Dados da matriz</h3>
              <label>
                Nome da empresa / matriz
                <input name="companyName" required minLength={2} />
              </label>
              <label>
                CNPJ (opcional)
                <input name="document" />
              </label>
              <label>
                Segmento
                <select name="segment" defaultValue="retail">
                  <option value="market">Mercado</option>
                  <option value="industry">Indústria</option>
                  <option value="retail">Comércio</option>
                  <option value="services">Serviços</option>
                  <option value="other">Outro</option>
                </select>
              </label>
              <label>
                Porte
                <select name="size" defaultValue="small">
                  <option value="small">Pequena</option>
                  <option value="medium">Média</option>
                  <option value="large">Grande</option>
                </select>
              </label>
            </div>
          )}
          <button className="primary" type="submit">
            {register ? "Criar matriz e acessar" : "Entrar"}
          </button>
          <button
            className="link"
            type="button"
            onClick={() => {
              setRegister(!register);
              setError("");
            }}
          >
            {register ? "Já tenho uma conta" : "Criar minha conta"}
          </button>
        </form>
      </section>
    </div>
  );
}
