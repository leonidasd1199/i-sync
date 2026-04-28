export interface LoginPayload {
  codigoCliente: string;
  password: string;
}

export interface LoginResponse {
  success?: boolean;
  accessToken?: string;
  cliente?: {
    codigo: string;
    nombre: string;
    sector?: string;
  };
  message?: string;
  need_password_setup?: boolean;
}

const API_URL = import.meta.env.VITE_API_URL;

interface ApiRequestOptions extends RequestInit {
  skipAuthRedirect?: boolean;
}

async function apiRequest(endpoint: string, options: ApiRequestOptions = {}) {
  const { skipAuthRedirect, ...fetchOptions } = options;
  const token = localStorage.getItem("token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  // ⛔ YA NO REDIRIGE en rutas que usan skipAuthRedirect
  if (res.status === 401 && !skipAuthRedirect) {
    localStorage.removeItem("token");
    localStorage.removeItem("clienteNombre");
    localStorage.removeItem("clienteCodigo");
    localStorage.removeItem("isGuest");

    window.location.href = "/";
    return null;
  }

  return res;
}

export { apiRequest };

export async function loginUser(data: LoginPayload): Promise<LoginResponse> {
  try {
    const res = await apiRequest(`/auth/login`, {
      method: "POST",
      body: JSON.stringify(data),
      skipAuthRedirect: true,
    });

    if (!res) return { message: "Sesión expirada." };

    const result = await res.json();

    if (!res.ok) {
      const errorMessage =
        typeof result?.message === "string"
          ? result.message
          : Array.isArray(result?.message)
          ? result.message[0]
          : "Error de autenticación.";

      return { message: errorMessage };
    }

    return result as LoginResponse;
  } catch {
    return { message: "No se pudo conectar con el servidor." };
  }
}

export async function checkPasswordStatus(
  codigoCliente: string
): Promise<{ hasPassword: boolean }> {
  try {
    const res = await apiRequest(`/auth/check-password/${codigoCliente}`, {
      skipAuthRedirect: true,
    });

    if (!res) return { hasPassword: false };

    return await res.json();
  } catch {
    return { hasPassword: false };
  }
}

export async function setPassword(
  codigoCliente: string,
  nuevaPassword: string,
  email: string
): Promise<{ message: string }> {
  try {
    const res = await apiRequest(`/auth/set-password`, {
      method: "POST",
      body: JSON.stringify({ codigoCliente, nuevaPassword, email }),
      skipAuthRedirect: true,
    });

    if (!res) return { message: "Sesión expirada." };

    const result = await res.json();

    if (!res.ok) {
      const errorMessage =
        typeof result?.message === "string"
          ? result.message
          : Array.isArray(result?.message)
          ? result.message[0]
          : "Error al guardar la contraseña.";

      return { message: errorMessage };
    }

    return result;
  } catch {
    return { message: "No se pudo conectar con el servidor." };
  }
}
