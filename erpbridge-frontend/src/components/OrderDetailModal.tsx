import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import Spinner from "./Spinner";

interface Producto {
  codigo: string;
  nombre: string;
  cantidad: number;
  preciounit: number;
  montototal: number;
}

interface Pedido {
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
}

interface OrderDetailModalProps {
  open: boolean;
  onClose: () => void;
  pedido: {
    pedido: Pedido;
    productos: Producto[];
  } | null;
}

export default function OrderDetailModal({ open, onClose, pedido }: OrderDetailModalProps) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [open]);

  const info = pedido?.pedido;
  const productos = pedido?.productos || [];

  const modalContent = (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-gray-500/40 backdrop-blur-sm z-[9999] 
                     flex items-end sm:items-center justify-center p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-gray-50 text-gray-800 w-full sm:max-w-5xl 
                       rounded-t-2xl sm:rounded-2xl md:rounded-3xl 
                       shadow-xl border border-gray-300 relative flex flex-col 
                       max-h-[95vh] sm:max-h-[90vh]"
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle para móvil */}
            <div className="sm:hidden w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3" />

            {/* Botón cerrar */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-5 sm:right-5 p-1 
                         text-gray-500 hover:text-orange-500 transition 
                         hover:bg-gray-100 rounded-full"
            >
              <X size={24} className="sm:w-7 sm:h-7" />
            </button>

            {!info ? (
              <div className="flex flex-col items-center justify-center flex-1 py-20">
                <Spinner />
                <p className="text-gray-500 text-sm mt-3">Cargando pedido...</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="p-4 sm:p-6 md:p-8 border-b border-gray-300 flex-shrink-0">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-500 mb-2 pr-8">
                    Pedido #{info.documento}
                  </h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2">
                    <p className="text-xs sm:text-sm text-gray-600">
                      <span className="font-semibold text-orange-500">Fecha:</span> {info.fecha}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600">
                      <span className="font-semibold text-orange-500">Cliente:</span>{" "}
                      <span className="break-words">{info.cliente} ({info.codcliente})</span>
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600">
                      <span className="font-semibold text-orange-500">Dirección:</span>{" "}
                      <span className="break-words">{info.direccion}</span>
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600">
                      <span className="font-semibold text-orange-500">Teléfono:</span>{" "}
                      {info.telefonos}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 sm:col-span-2">
                      <span className="font-semibold text-orange-500">Vendedor:</span>{" "}
                      {info.vendedor}
                    </p>
                  </div>
                  
                  {info.notas && (
                    <p className="text-xs sm:text-sm text-gray-700 mt-3 sm:mt-4 whitespace-pre-wrap italic">
                      {info.notas}
                    </p>
                  )}
                </div>

                {/* Contenido con scroll */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6">
                  <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 mb-3">
                    Productos ({info.totalProductos})
                  </h3>

                  {/* Tabla desktop */}
                  <div className="hidden sm:block overflow-x-auto rounded-xl border border-gray-300 shadow-sm">
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-gray-100 text-gray-700 uppercase sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left bg-gray-100">Código</th>
                          <th className="px-4 py-3 text-left bg-gray-100">Nombre</th>
                          <th className="px-4 py-3 text-center bg-gray-100">Cant.</th>
                          <th className="px-4 py-3 text-center bg-gray-100">Precio</th>
                          <th className="px-4 py-3 text-center bg-gray-100">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productos.map((p, idx) => (
                          <tr
                            key={idx}
                            className={`border-t border-gray-200 ${
                              idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                            } hover:bg-gray-100 transition`}
                          >
                            <td className="px-4 py-3 text-xs">{p.codigo}</td>
                            <td className="px-4 py-3">{p.nombre}</td>
                            <td className="px-4 py-3 text-center">{p.cantidad}</td>
                            <td className="px-4 py-3 text-center">{p.preciounit.toFixed(2)}</td>
                            <td className="px-4 py-3 text-center font-semibold">{p.montototal.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Cards móvil */}
                  <div className="sm:hidden space-y-3">
                    {productos.map((p, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 text-sm truncate">{p.nombre}</p>
                            <p className="text-xs text-gray-500">{p.codigo}</p>
                          </div>
                          <span className="text-sm font-bold text-orange-500 ml-2">
                            {p.montototal.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Cant: {p.cantidad}</span>
                          <span>@ {p.preciounit.toFixed(2)} LPS</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-300 p-4 sm:p-6 flex-shrink-0 bg-gray-50">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                    <div className="flex gap-4 text-xs sm:text-sm text-gray-600">
                      <p>
                        <span className="font-semibold text-orange-500">Productos:</span>{" "}
                        {info.totalProductos}
                      </p>
                      <p>
                        <span className="font-semibold text-orange-500">Cantidad:</span>{" "}
                        {info.cantidadTotal}
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-end gap-0.5">
                      <div className="flex gap-4 text-xs sm:text-sm text-gray-600">
                        <span>Subtotal: <b>{info.subtotal.toFixed(2)}</b></span>
                        <span>ISV: <b>{info.impuestos.toFixed(2)}</b></span>
                        {info.descuento > 0 && (
                          <span>Desc: <b>-{info.descuento.toFixed(2)}</b></span>
                        )}
                      </div>
                      <p className="text-lg sm:text-xl font-bold text-orange-500">
                        Total: {info.total.toFixed(2)} LPS
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}