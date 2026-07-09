import type { FormEvent } from "react";
import { api } from "../../lib/api";
import type { Company } from "../../types";

export function CreateCompany({
  token,
  onCreated,
}: {
  token: string;
  onCreated: (company: Company) => void;
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onCreated(
      await api<Company>(
        "/companies",
        {
          method: "POST",
          body: JSON.stringify({
            name: data.get("name"),
            document: data.get("document") || undefined,
            segment: data.get("segment"),
            size: data.get("size"),
          }),
        },
        token,
      ),
    );
  }
  return (
    <section className="empty-state">
      <div className="empty-icon">⌂</div>
      <h1>Vamos configurar sua empresa</h1>
      <p>Isso leva menos de um minuto.</p>
      <form className="inline-form" onSubmit={(event) => void submit(event)}>
        <input name="name" placeholder="Nome da empresa" required />
        <input name="document" placeholder="CNPJ (opcional)" />
        <select name="segment" defaultValue="retail">
          <option value="market">Mercado</option>
          <option value="industry">Indústria</option>
          <option value="retail">Comércio</option>
          <option value="services">Serviços</option>
          <option value="other">Outro</option>
        </select>
        <select name="size" defaultValue="small">
          <option value="small">Pequena</option>
          <option value="medium">Média</option>
          <option value="large">Grande</option>
        </select>
        <button className="primary">Criar empresa</button>
      </form>
    </section>
  );
}
