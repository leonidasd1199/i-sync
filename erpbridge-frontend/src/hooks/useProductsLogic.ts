import { useState, useEffect, useMemo } from "react";
import { useProductos } from "../context/ProductosContext";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CarContext";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const trimStr = (v: any) => (v ?? "").toString().trim();

export const useProductosLogic = () => {
  const {
    articulos,
    loading,
    error,
    fetchArticulos,
    total,
    pages,
    grupos,
    subgrupos,
    modelos,
    fetchModelos,
  } = useProductos();

  const { isGuest } = useAuth();
  const { cart, addToCart, updateQuantity, removeFromCart } = useCart();

  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("todos");
  const [grupo, setGrupo] = useState("");
  const [subgrupo, setSubgrupo] = useState("");
  const [modelo, setModelo] = useState("");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 400);

  const filteredSubgrupos = useMemo(() => {
    if (!grupo) return [];
    if (!Array.isArray(subgrupos)) return [];
    return subgrupos.filter((s: any) => trimStr(s.codigo) === trimStr(grupo));
  }, [grupo, subgrupos]);

  useEffect(() => {
    fetchArticulos(page, debouncedSearch.trim(), {
      stockFilter,
      grupo,
      subgrupo,
      modelo,
    });
  }, [page, debouncedSearch, stockFilter, grupo, subgrupo, modelo]);

  // Reset página cuando cambia la búsqueda
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    if (isGuest) return;
    if (subgrupo) {
      fetchModelos(grupo, subgrupo);
    } else if (grupo) {
      fetchModelos(grupo);
    } else {
      fetchModelos();
    }
  }, [grupo, subgrupo, isGuest]);

  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  const openModal = (product: any) => {
    setSelectedProduct(product);
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const filters = {
    search,
    stockFilter,
    grupo,
    subgrupo,
    modelo,
    grupos,
    subgrupos: filteredSubgrupos,
    modelos,
    isGuest,
  };

  const handlers = {
    setSearch,
    setStockFilter: (sf: string) => {
      setStockFilter(sf);
      setPage(1);
    },
    setGrupo: (g: string) => {
      setGrupo(trimStr(g));
      setSubgrupo("");
      setModelo("");
      setPage(1);
    },
    setSubgrupo: (sg: string) => {
      setSubgrupo(trimStr(sg));
      setModelo("");
      setPage(1);
    },
    setModelo: (m: string) => {
      setModelo(trimStr(m));
      setPage(1);
    },
  };

  return {
    articulos,
    total,
    loading,
    error,
    page,
    setPage,
    totalPages: pages,
    filters,
    handlers,
    openModal,
    closeModal,
    selectedProduct,
    showModal,
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
  };
};