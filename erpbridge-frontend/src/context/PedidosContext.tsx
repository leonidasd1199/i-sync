import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { useCart } from "./CarContext";
import { api } from "../lib/api";

interface PedidoResponse {
  success: boolean;
  mensaje: string;
  documento?: string;
  idvalidacion?: string;
  totalFinal?: number;
  // Nuevos campos del backend
  emailEnviandose?: boolean;
  storedInRedis?: boolean;
  error?: string;
  tipoError?: "BACKEND_CAIDO" | "PEDIDO_ERROR";
}

interface Pedido {
  documento: string;
  codcliente: string;
  nombrecli: string;
  vendedor: string;
  totneto: number;
  totalfinal: number;
  uemisor: string;
  fecha: string;
}

interface PedidoDetalle {
  pedido: {
    documento: string;
    fecha: string;
    cliente: string;
    codcliente: string;
    direccion: string;
    telefonos: string;
    vendedor: string;
    notas?: string;
    subtotal: number;
    impuestos: number;
    descuento: number;
    total: number;
    cantidadTotal: number;
    totalProductos: number;
  };
  productos: {
    codigo: string;
    nombre: string;
    cantidad: number;
    preciounit: number;
    montototal: number;
  }[];
}

interface PedidosContextType {
  crearPedido: (vendedor: string, notas?: string) => Promise<PedidoResponse | null>;
  listarPedidosPaginated: (page?: number, search?: string) => Promise<void>;
  fetchPedidoDetalle: (documento: string) => Promise<PedidoDetalle | null>;
  pedidos: Pedido[];
  page: number;
  totalPages: number;
  total: number;
  loading: boolean;
  error: string | null;
  lastPedido: PedidoResponse | null;
  setPage: (page: number) => void;
  search: string;
  setSearch: (v: string) => void;
}

const PedidosContext = createContext<PedidosContextType | undefined>(undefined);

export function PedidosProvider({ children }: { children: ReactNode }) {
  const { clienteCodigo, isGuest } = useAuth();
  const { cart, clearCart } = useCart();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPedido, setLastPedido] = useState<PedidoResponse | null>(null);

  const baseUrl = import.meta.env.VITE_API_URL;

  const crearPedido = async (vendedor: string, notas?: string): Promise<PedidoResponse | null> => {
    if (isGuest) {
      setError("Los usuarios invitados no pueden realizar pedidos.");
      return null;
    }

    if (!clienteCodigo) {
      setError("Código de cliente no disponible.");
      return null;
    }

    if (cart.length === 0) {
      setError("El carrito está vacío.");
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const body = {
        codCliente: clienteCodigo,
        vendedor,
        notas: notas || "",
        carrito: cart.map((item) => ({
          codigo: item.codigo,
          cantidad: item.cantidad,
        })),
      };

      const res = await api(`${baseUrl}/pedidos?empresa=001000&agencia=001`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      const data: PedidoResponse = await res.json();

      // Guardar siempre la respuesta para que el componente pueda mostrar detalles
      setLastPedido(data);

      // Si el pedido se guardó en Redis (backend caído), no es un error fatal
      if (data.storedInRedis && !data.success) {
        // El pedido se guardó para reintento, informar al usuario
        setError(null); // No es un error crítico
        return data;
      }

      if (!data.success) {
        throw new Error(data.mensaje || data.error || "Error al crear el pedido.");
      }

      clearCart();
      return data;
    } catch (err: any) {
      const errorMsg = err.message || "Error desconocido al crear pedido.";
      setError(errorMsg);
      
      // Retornar un objeto de error para que el componente pueda manejarlo
      return {
        success: false,
        mensaje: errorMsg,
        error: errorMsg,
      };
    } finally {
      setLoading(false);
    }
  };

  const listarPedidosPaginated = async (p = 1, q = "") => {
    try {
      setLoading(true);

      const res = await api(
        `${baseUrl}/pedidos/paginated?empresa=001000&page=${p}&limit=12&q=${q}`
      );

      const data = await res.json();

      setPedidos(data.data || []);
      setPage(data.page || 1);
      setTotalPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch {
      setError("No se pudieron cargar los pedidos.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPedidoDetalle = async (documento: string): Promise<PedidoDetalle | null> => {
    try {
      setLoading(true);

      const res = await api(`${baseUrl}/pedidos/${documento}?empresa=001000`);

      if (!res.ok) throw new Error("Error al obtener detalle del pedido.");

      return await res.json();
    } catch {
      setError("No se pudo obtener el detalle del pedido.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    listarPedidosPaginated(page, search);
  }, [page, search]);

  return (
    <PedidosContext.Provider
      value={{
        crearPedido,
        listarPedidosPaginated,
        fetchPedidoDetalle,
        pedidos,
        page,
        totalPages,
        total,
        loading,
        error,
        lastPedido,
        setPage,
        search,
        setSearch,
      }}
    >
      {children}
    </PedidosContext.Provider>
  );
}

export const usePedidos = () => {
  const ctx = useContext(PedidosContext);
  if (!ctx) throw new Error("usePedidos debe usarse dentro de PedidosProvider");
  return ctx;
};