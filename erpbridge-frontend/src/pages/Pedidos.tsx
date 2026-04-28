import { useState, useEffect } from "react";
import DashboardLayout from "../layout/DashboardLayout";
import { usePedidosLogic } from "../hooks/usePedidosLogic";
import PedidoFilters from "../components/pedidos/PedidoFilters";
import PedidoCard from "../components/pedidos/PedidoCard";
import Pagination from "../components/productos/Pagination";
import Spinner from "../components/Spinner";
import OrderDetailModal from "../components/OrderDetailModal";
import { usePedidos } from "../context/PedidosContext";
import { RotateCcw } from "lucide-react";

export default function Pedidos() {
  const {
    pedidos,
    loading,
    error,
    page,
    totalPages,
    setPage,
    search,
    setSearch,
    fetchPedidos,
  } = usePedidosLogic();

  const { fetchPedidoDetalle } = usePedidos();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [openModal, setOpenModal] = useState(false);
  const [loadingModal, setLoadingModal] = useState(false);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    fetchPedidos();
  }, []);

  const handleOpenPedido = async (documento: string) => {
    try {
      setLoadingModal(true);
      const data = await fetchPedidoDetalle(documento);
      if (data) {
        setSelectedOrder(data);
        setOpenModal(true);
      }
    } finally {
      setLoadingModal(false);
    }
  };

  const handleReload = async () => {
    try {
      setReloading(true);
      await fetchPedidos();
    } finally {
      setTimeout(() => setReloading(false), 300);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 text-gray-800 bg-gray-100 rounded-xl md:rounded-2xl min-h-screen transition-colors duration-500">
        
        {/* Header - stack en móvil, row en desktop */}
        <div className="flex flex-col lg:flex-row items-center justify-between mb-6 md:mb-8 gap-4">
          
          {/* Botón recargar - orden 2 en móvil, orden 1 en desktop */}
          <div className="order-2 lg:order-1 w-full lg:w-72 flex justify-center lg:justify-start">
            <button
              onClick={handleReload}
              disabled={loading || reloading}
              className="p-2 shrink-0 rounded-full border border-gray-300 bg-white 
                         text-gray-600 hover:text-orange-600 hover:border-orange-400 
                         transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Recargar pedidos"
            >
              <RotateCcw
                size={18}
                className={`transition-transform duration-500 ${reloading ? "rotate-[360deg]" : ""}`}
              />
            </button>
          </div>

          {/* Título - orden 1 en móvil */}
          <h1 className="order-1 lg:order-2 text-xl md:text-2xl font-bold text-gray-800 text-center flex-1 whitespace-nowrap">
            Pedidos
          </h1>

          {/* Filtros - orden 3 siempre */}
          <div className="order-3 w-full lg:w-72 shrink-0">
            <PedidoFilters search={search} setSearch={setSearch} />
          </div>
        </div>

        {/* Content */}
        {loading && !loadingModal ? (
          <div className="fixed inset-0 bg-gray-500/40 backdrop-blur-sm flex items-center justify-center z-[9999]">
            <Spinner />
          </div>
        ) : error ? (
          <p className="text-red-500 text-center mt-6 md:mt-8 font-medium">{error}</p>
        ) : pedidos.length === 0 ? (
          <p className="text-center text-gray-500 mt-8 md:mt-10">No se encontraron pedidos.</p>
        ) : (
          <>
            <Pagination page={page} totalPages={totalPages} setPage={setPage} position="top" />

            {/* Grid responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {pedidos.map((p) => (
                <PedidoCard
                  key={p.documento}
                  pedido={p}
                  onClick={() => handleOpenPedido(p.documento)}
                />
              ))}
            </div>

            <Pagination page={page} totalPages={totalPages} setPage={setPage} position="bottom" />
          </>
        )}

        {/* Loading modal overlay */}
        {loadingModal && (
          <div className="fixed inset-0 bg-gray-500/40 backdrop-blur-sm flex items-center justify-center z-[9999]">
            <Spinner />
          </div>
        )}

        {/* Order detail modal */}
        <OrderDetailModal
          open={openModal}
          onClose={() => {
            setOpenModal(false);
            setTimeout(() => setSelectedOrder(null), 300);
          }}
          pedido={selectedOrder}
        />
      </div>
    </DashboardLayout>
  );
}