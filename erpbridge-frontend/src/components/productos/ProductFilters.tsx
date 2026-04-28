import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Eraser, SlidersHorizontal, X } from "lucide-react";

export default function ProductFilters({ filters, handlers }: any) {
  const {
    search,
    stockFilter,
    grupo,
    subgrupo,
    modelo,
    grupos = [],
    subgrupos = [],
    modelos = [],
    isGuest,
  } = filters;

  const { setSearch, setStockFilter, setGrupo, setSubgrupo, setModelo } = handlers;

  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const reset = () => {
    setSearch("");
    setStockFilter("todos");
    setGrupo("");
    setSubgrupo("");
    setModelo("");
    setModelSearch("");
  };

  const filteredModelos = modelos.filter((m: string) =>
    m.toLowerCase().includes(modelSearch.toLowerCase())
  );

  const activeFiltersCount = [
    stockFilter !== "todos",
    grupo !== "",
    subgrupo !== "",
    modelo !== "",
  ].filter(Boolean).length;

  const baseSelectClass =
    "px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none transition-all duration-300 hover:border-orange-400/50 shadow-sm cursor-pointer";

  // Componente del modal móvil
  const MobileFiltersModal = () => (
    <AnimatePresence>
      {showMobileFilters && !isGuest && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMobileFilters(false)}
            className="fixed inset-0 bg-black/50 z-[9999] lg:hidden"
          />

          {/* Panel */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-[9999] 
                       p-4 pb-8 max-h-[80vh] overflow-y-auto lg:hidden"
          >
            {/* Header del panel */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800">Filtros</h2>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            {/* Filtros en columna */}
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1.5 block">Stock</label>
                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                  className={`${baseSelectClass} w-full`}
                >
                  <option value="todos">Todos</option>
                  <option value="con-stock">Con stock</option>
                  <option value="sin-stock">Sin stock</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 mb-1.5 block">Grupo</label>
                <select
                  value={grupo}
                  onChange={(e) => setGrupo(e.target.value)}
                  className={`${baseSelectClass} w-full`}
                >
                  <option value="">Todos los grupos</option>
                  {grupos.map((g: any) => (
                    <option key={g.codigo?.trim()} value={g.codigo?.trim()}>
                      {g.nombre?.trim()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 mb-1.5 block">Subgrupo</label>
                <select
                  value={subgrupo}
                  onChange={(e) => setSubgrupo(e.target.value)}
                  disabled={!grupo}
                  className={`${baseSelectClass} w-full ${!grupo ? "opacity-50 bg-gray-100" : ""}`}
                >
                  {!grupo ? (
                    <option value="">Seleccione un grupo primero</option>
                  ) : (
                    <>
                      <option value="">Todos los subgrupos</option>
                      {Array.from(new Map(subgrupos.map((s: any) => [s.subcodigo?.trim(), s])).values()).map((s: any) => (
                        <option key={s.subcodigo?.trim()} value={s.subcodigo?.trim()}>
                          {s.nombre?.trim()}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 mb-1.5 block">Modelo</label>
                <select
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  disabled={!subgrupo}
                  className={`${baseSelectClass} w-full ${!subgrupo ? "opacity-50 bg-gray-100" : ""}`}
                >
                  <option value="">
                    {!subgrupo ? "Seleccione un subgrupo primero" : "Todos los modelos"}
                  </option>
                  {filteredModelos.map((m: string) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Botones */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    reset();
                    setShowMobileFilters(false);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 
                             rounded-lg border border-gray-300 text-gray-700 
                             hover:bg-gray-50 transition-all"
                >
                  <Eraser size={16} />
                  Limpiar
                </button>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="flex-1 px-4 py-3 rounded-lg bg-orange-500 text-white 
                             hover:bg-orange-600 transition-all font-medium"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <div className="flex flex-col gap-4 mb-6 md:mb-8 bg-gradient-to-br from-gray-100 via-gray-50 to-white p-4 md:p-6 rounded-xl md:rounded-2xl border border-gray-200 shadow-sm">
        
        {/* Header row */}
        <div className="flex flex-col gap-4">
          
          {/* Título + búsqueda + botón filtros móvil */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-xl md:text-2xl font-bold text-orange-500 tracking-tight"
            >
              {isGuest
                ? "Catálogo público"
                : stockFilter === "con-stock"
                ? "Productos con stock"
                : stockFilter === "sin-stock"
                ? "Productos sin stock"
                : "Todos los productos"}
            </motion.h1>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Búsqueda */}
              <div className="relative flex-1 sm:w-64 md:w-80">
                <input
                  type="text"
                  placeholder="Buscar nombre, código..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="px-3 md:px-4 py-2 rounded-lg w-full bg-white border border-gray-300 
                             text-gray-700 text-sm placeholder-gray-400 focus:ring-2 
                             focus:ring-orange-400 focus:outline-none transition-all duration-300 
                             shadow-sm pr-10 hover:border-orange-400/40"
                />
                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>

              {/* Botón filtros - solo móvil */}
              {!isGuest && (
                <button
                  onClick={() => setShowMobileFilters(true)}
                  className="lg:hidden relative flex items-center gap-2 px-3 py-2 rounded-lg 
                             bg-white border border-gray-300 text-gray-700 hover:border-orange-400/50 
                             shadow-sm transition-all"
                >
                  <SlidersHorizontal size={18} />
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs 
                                     font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Filtros desktop */}
          {!isGuest && (
            <div className="hidden lg:flex flex-wrap items-center gap-3">
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className={`${baseSelectClass} w-32`}
              >
                <option value="todos">Todos</option>
                <option value="con-stock">Con stock</option>
                <option value="sin-stock">Sin stock</option>
              </select>

              <select
                value={grupo}
                onChange={(e) => setGrupo(e.target.value)}
                className={`${baseSelectClass} w-40`}
              >
                <option value="">Todos los grupos</option>
                {grupos.map((g: any) => (
                  <option key={g.codigo?.trim()} value={g.codigo?.trim()}>
                    {g.nombre?.trim()}
                  </option>
                ))}
              </select>

              <select
                value={subgrupo}
                onChange={(e) => setSubgrupo(e.target.value)}
                disabled={!grupo}
                className={`${baseSelectClass} w-44 ${!grupo ? "opacity-50 cursor-not-allowed bg-gray-100" : ""}`}
              >
                {!grupo ? (
                  <option value="">Seleccione grupo</option>
                ) : (
                  <>
                    <option value="">Todos los subgrupos</option>
                    {Array.from(new Map(subgrupos.map((s: any) => [s.subcodigo?.trim(), s])).values()).map((s: any) => (
                      <option key={s.subcodigo?.trim()} value={s.subcodigo?.trim()}>
                        {s.nombre?.trim()}
                      </option>
                    ))}
                  </>
                )}
              </select>

              {/* Modelo dropdown desktop */}
              <div className="relative w-44">
                <button
                  disabled={!subgrupo}
                  onClick={() => setShowModelDropdown((prev) => !prev)}
                  className={`${baseSelectClass} w-full text-left truncate ${!subgrupo ? "opacity-50 cursor-not-allowed bg-gray-100" : ""}`}
                >
                  {modelo || "Seleccionar modelo"}
                </button>

                <AnimatePresence>
                  {showModelDropdown && subgrupo && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="absolute z-50 bg-white w-full mt-1 shadow-lg rounded-lg border border-gray-200 max-h-56 overflow-y-auto"
                    >
                      <div className="sticky top-0 bg-white p-2 border-b flex items-center gap-2">
                        <Search size={14} className="text-gray-400" />
                        <input
                          type="text"
                          placeholder="Buscar modelo..."
                          value={modelSearch}
                          onChange={(e) => setModelSearch(e.target.value)}
                          className="w-full outline-none text-gray-700 text-sm"
                        />
                      </div>

                      <button
                        onClick={() => {
                          setModelo("");
                          setShowModelDropdown(false);
                        }}
                        className="p-2 hover:bg-gray-100 w-full text-left text-sm"
                      >
                        Todos los modelos
                      </button>

                      {filteredModelos.map((m: string) => (
                        <button
                          key={m}
                          onClick={() => {
                            setModelo(m);
                            setShowModelDropdown(false);
                            setModelSearch("");
                          }}
                          className="p-2 hover:bg-orange-100 w-full text-left text-sm"
                        >
                          {m}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={reset}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 
                           text-white text-sm hover:bg-orange-600 shadow transition-all"
              >
                <Eraser size={16} />
                Reset
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal renderizado con portal - fuera del flujo normal del DOM */}
      {typeof document !== "undefined" && createPortal(<MobileFiltersModal />, document.body)}
    </>
  );
}