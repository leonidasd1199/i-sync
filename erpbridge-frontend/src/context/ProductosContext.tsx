import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";

interface Articulo {
  codigo: string;
  nombre: string;
  impuesto1: number;
  precioBase: number;
  precioFinal: number;
  formafiscal: number;
  stock?: number;
  aceptaDscto?: number;
  rutafoto?: string;
  marca?: string;
  modelo?: string;
  grupo?: string;
  subgrupo?: string;
  detalles?: string;
  contraindi?: string;
  codigosAlternativos?: string[];
}

interface ProductosContextProps {
  articulos: Articulo[];
  total: number;
  pages: number;
  loading: boolean;
  error: string | null;
  grupos: any[];
  subgrupos: any[];
  modelos: string[];
  fetchArticulos: (
    page?: number,
    search?: string,
    filters?: {
      stockFilter?: string;
      modelo?: string;
      grupo?: string;
      subgrupo?: string;
    }
  ) => Promise<void>;
  fetchModelos: (grupo?: string, subgrupo?: string) => Promise<void>;
}

const ProductosContext = createContext<ProductosContextProps>({
  articulos: [],
  total: 0,
  pages: 1,
  loading: false,
  error: null,
  grupos: [],
  subgrupos: [],
  modelos: [],
  fetchArticulos: async () => {},
  fetchModelos: async () => {},
});

export const ProductosProvider = ({ children }: { children: React.ReactNode }) => {
  const { isGuest, clienteCodigo } = useAuth();

  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [grupos, setGrupos] = useState<any[]>([]);
  const [subgrupos, setSubgrupos] = useState<any[]>([]);
  const [modelos, setModelos] = useState<string[]>([]);

  const fetchArticulos = useCallback(async (
    pageNumber = 1,
    searchTerm = "",
    filters: {
      stockFilter?: string;
      modelo?: string;
      grupo?: string;
      subgrupo?: string;
    } = {}
  ) => {
    try {
      setLoading(true);
      setError(null);

      const base = import.meta.env.VITE_API_URL;
      const params = new URLSearchParams();

      params.append("page", pageNumber.toString());
      params.append("limit", "8");

      if (searchTerm.trim() !== "") params.append("q", searchTerm.trim());

      if (!isGuest) {
        params.append("empresa", "001000");
        params.append("agencia", "001");
        params.append("codCliente", clienteCodigo || "");
      }

Object.entries(filters).forEach(([key, value]) => {
  if (!value || value === "todos") return;

  if (key === "stockFilter") {
    params.append("stock", value);
    return;
  }

  params.append(key, value.trim());
});



      const endpoint = isGuest
        ? `${base}/articulos/guest?${params.toString()}`
        : `${base}/articulos?${params.toString()}`;

      const res = await fetch(endpoint);
      if (!res.ok) throw new Error();

      const data = await res.json();

      setArticulos(data.data || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch {
      setError("Error al cargar productos.");
    } finally {
      setLoading(false);
    }
  }, [isGuest, clienteCodigo]);

  const fetchGruposYSubgrupos = async () => {
    try {
      const base = import.meta.env.VITE_API_URL;
      const res = await fetch(`${base}/articulos/grupos-subgrupos`);
      const data = await res.json();

      const gruposData = data.grupos || [];
      setGrupos(gruposData);
      localStorage.setItem("grupos", JSON.stringify(gruposData));

      const flatten: any[] = [];
      const structure = data.subgruposPorGrupo || {};

      Object.entries(structure).forEach(([grupoCodigo, lista]) => {
        (lista as any[]).forEach((s) => {
          flatten.push({
            codigo: grupoCodigo,
            subcodigo: s.codigo,
            nombre: s.nombre,
          });
        });
      });

      setSubgrupos(flatten);
      localStorage.setItem("subgrupos", JSON.stringify(flatten));
    } catch {}
  };

  const fetchModelos = useCallback(async (grupo?: string, subgrupo?: string) => {
    try {
      const base = import.meta.env.VITE_API_URL;
      const params = new URLSearchParams({ empresa: "001000" });

      if (grupo) params.append("grupo", grupo);
      if (subgrupo) params.append("subgrupo", subgrupo);

      const res = await fetch(`${base}/articulos/modelos?${params.toString()}`);
      const data = await res.json();
      setModelos(data || []);
    } catch {
      setModelos([]);
    }
  }, []);

  useEffect(() => {
    if (!isGuest) {
      fetchGruposYSubgrupos();
      fetchModelos();
    }
  }, [isGuest, fetchModelos]);

  return (
    <ProductosContext.Provider
      value={{
        articulos,
        total,
        pages,
        loading,
        error,
        grupos,
        subgrupos,
        modelos,
        fetchArticulos,
        fetchModelos,
      }}
    >
      {children}
    </ProductosContext.Provider>
  );
};

export const useProductos = () => useContext(ProductosContext);