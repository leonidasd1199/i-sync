import ProductCard from "./ProductCard";
import { motion } from "framer-motion";

export default function ProductGrid({ products, openModal }: any) {
  if (!products || products.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center text-gray-500 mt-16"
      >
        <p className="text-lg font-medium">
          No se encontraron productos disponibles.
        </p>
        <p className="text-sm text-gray-400 mt-1">
          Intenta ajustar los filtros o realizar una nueva búsqueda.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative bg-gradient-to-br from-gray-100 via-gray-50 to-white 
                 rounded-2xl p-6 border border-gray-200 shadow-inner
                 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 
                 transition-all duration-500"
    >
      {/* 🎨 Efecto visual sutil (resplandor superior) */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-orange-400/40 via-orange-300/30 to-transparent rounded-t-2xl" />

      {products.map((art: any, index: number) => (
        <motion.div
          key={art.codigo}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.4,
            delay: index * 0.05,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <ProductCard producto={art} openModal={openModal} />
        </motion.div>
      ))}
    </motion.div>
  );
}
