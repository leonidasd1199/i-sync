import { checkExpiration } from "../services/checkExpiration";

export async function api(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");

  const response = await checkExpiration(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
      ...(options.headers || {}),
    },
  });

  // Si expiró, checkExpiration retorna null
  if (!response) {
    return {
      ok: false,
      json: () => ({ error: "Sesión expirada" }),
    };
  }

  return response;
}
