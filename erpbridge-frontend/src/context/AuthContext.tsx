import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { loginUser } from "../services/authService";

interface AuthContextProps {
  token: string | null;
  clienteNombre: string | null;
  clienteCodigo: string | null;
  isGuest: boolean;
  isAuthenticated: boolean;
  sessionKey: number;
  login: (
    codigoCliente: string,
    password: string
  ) => Promise<"success" | "need_password_setup" | { error: string }>;
  loginGuest: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextProps>({
  token: null,
  clienteNombre: null,
  clienteCodigo: null,
  isGuest: false,
  isAuthenticated: false,
  sessionKey: 0,
  login: async () => ({ error: "unknown" }),
  loginGuest: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [clienteNombre, setClienteNombre] = useState<string | null>(null);
  const [clienteCodigo, setClienteCodigo] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedCliente = localStorage.getItem("clienteNombre");
    const savedCodigo = localStorage.getItem("clienteCodigo");
    const guestFlag = localStorage.getItem("isGuest") === "true";

    if (savedToken) setToken(savedToken);
    if (savedCliente) setClienteNombre(savedCliente);
    if (savedCodigo) setClienteCodigo(savedCodigo);
    if (guestFlag) setIsGuest(true);

    setLoading(false);
  }, []);

  const login = async (
    codigoCliente: string,
    password: string
  ): Promise<"success" | "need_password_setup" | { error: string }> => {
    try {
      const result = await loginUser({ codigoCliente, password });

      if (result?.need_password_setup) {
        return "need_password_setup";
      }

      if (result?.accessToken) {
        localStorage.setItem("token", result.accessToken);
        localStorage.setItem("isGuest", "false");

        if (result.cliente?.nombre) {
          localStorage.setItem("clienteNombre", result.cliente.nombre);
          setClienteNombre(result.cliente.nombre);
        }

        if (result.cliente?.codigo) {
          localStorage.setItem("clienteCodigo", result.cliente.codigo);
          setClienteCodigo(result.cliente.codigo);
        }

        setToken(result.accessToken);
        setIsGuest(false);
        setSessionKey(Date.now());
        return "success";
      }

      if (result?.message) {
        return { error: result.message };
      }

      return { error: "Error desconocido al iniciar sesión." };

    } catch (err: unknown) {
      if (err instanceof Error) {
        return { error: err.message };
      }
      return { error: "Error al conectar con el servidor." };
    }
  };

  const loginGuest = () => {
    const guestToken = `guest-${crypto.randomUUID()}`;
    localStorage.setItem("token", guestToken);
    localStorage.setItem("isGuest", "true");
    localStorage.setItem("clienteNombre", "Invitado");
    localStorage.setItem("clienteCodigo", "INVITADO");

    setToken(guestToken);
    setIsGuest(true);
    setClienteNombre("Invitado");
    setClienteCodigo("INVITADO");
    setSessionKey(Date.now());
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("clienteNombre");
    localStorage.removeItem("clienteCodigo");
    localStorage.removeItem("isGuest");

    setToken(null);
    setClienteNombre(null);
    setClienteCodigo(null);
    setIsGuest(false);
    setSessionKey(Date.now());
  };

  // ✅ CORRECCIÓN: No renderizar children mientras carga
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <span>Cargando...</span>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        clienteNombre,
        clienteCodigo,
        isGuest,
        isAuthenticated: !!token || isGuest,
        sessionKey,
        login,
        loginGuest,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);