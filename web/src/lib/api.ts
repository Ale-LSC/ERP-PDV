const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export async function api<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  window.dispatchEvent(new Event("erp:request-start"));
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(localStorage.getItem("erp-branch")
          ? { "X-Branch-Id": localStorage.getItem("erp-branch")! }
          : {}),
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401 && token) {
        localStorage.removeItem("erp-token");
        window.dispatchEvent(new Event("erp:unauthorized"));
      }
      const body = (await response.json().catch(() => null)) as {
        message?: string | string[];
      } | null;
      const message = Array.isArray(body?.message)
        ? body.message.join(", ")
        : body?.message;
      throw new Error(
        response.status === 401
          ? "Sua sessão expirou. Entre novamente."
          : (message ?? "Não foi possível concluir a operação."),
      );
    }

    const text = await response.text();

    if (!text) return null as T;

    return JSON.parse(text) as T;
  } finally {
    window.dispatchEvent(new Event("erp:request-end"));
  }
}
