import DashboardLayout from "../layout/DashboardLayout";
import { useProductosLogic } from "../hooks/useProductsLogic";
import ProductFilters from "../components/productos/ProductFilters";
import ProductGrid from "../components/productos/ProductGrid";
import Pagination from "../components/productos/Pagination";
import Spinner from "../components/Spinner";
import ProductDetailModal from "../components/ProductDetailModal";

export default function Productos() {
  const {
    loading,
    error,
    articulos,
    totalPages,
    page,
    setPage,
    filters,
    handlers,
    openModal,
    closeModal,
    selectedProduct,
    showModal,
  } = useProductosLogic();

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 text-gray-800 bg-gray-100 rounded-xl md:rounded-2xl min-h-screen transition-colors duration-500">
        {/* Filtros */}
        <ProductFilters filters={filters} handlers={handlers} />

        {/* Estado de carga / error / contenido */}
        {loading ? (
          <div className="flex justify-center py-16 md:py-32">
            <Spinner />
          </div>
        ) : error ? (
          <p className="text-red-500 text-center mt-6 md:mt-8 font-medium">
            {error}
          </p>
        ) : articulos.length === 0 ? (
          <p className="text-center text-gray-500 mt-8 md:mt-10">
            No se encontraron productos.
          </p>
        ) : (
          <>
            <Pagination
              page={page}
              totalPages={totalPages}
              setPage={setPage}
              position="top"
            />

            {/* Grid de productos */}
            <ProductGrid products={articulos} openModal={openModal} />

            <Pagination
              page={page}
              totalPages={totalPages}
              setPage={setPage}
              position="bottom"
            />
          </>
        )}
      </div>

      {/* Modal de detalle del producto */}
      <ProductDetailModal
        open={showModal}
        onClose={closeModal}
        product={selectedProduct}
      />
    </DashboardLayout>
  );
}