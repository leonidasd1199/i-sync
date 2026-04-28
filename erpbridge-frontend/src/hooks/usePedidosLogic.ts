import { usePedidos } from "../context/PedidosContext";

export function usePedidosLogic() {
  const {
    pedidos,
    listarPedidosPaginated,
    loading,
    error,
    page,
    totalPages,
    setPage,
    search,
    setSearch,
  } = usePedidos();

  const fetchPedidos = async () => {
    await listarPedidosPaginated(page, search);
  };

  return {
    pedidos,
    loading,
    error,
    page,
    totalPages,
    setPage,
    search,
    setSearch,
    fetchPedidos,
  };
}
