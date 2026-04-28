import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, ZoomIn, ZoomOut, ChevronRight, FileText, Hash, Search } from "lucide-react";
import { useCart } from "../context/CarContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

interface Grupo {
  codigo: string;
  nombre: string;
}

interface Subgrupo {
  codigo: string;
  subcodigo: string;
  nombre: string;
}

interface ProductDetailModalProps {
  open: boolean;
  onClose: () => void;
  product: {
    codigo: string;
    nombre: string;
    referencia?: string;
    precio?: number | string;
    precioBase?: number | string;
    precioFinal?: number | string;
    stock?: number;
    impuesto1?: number;
    rutafoto?: string;
    detalles?: string;
    contraindi?: string;
    marca?: string;
    modelo?: string;
    grupo?: string;
    subgrupo?: string;
    formafiscal: number;
    codigosAlternativos?: string[];
  } | null;
}

// Sub-modal para códigos alternativos con buscador
function CodesModal({ 
  open, 
  onClose, 
  codes, 
}: { 
  open: boolean; 
  onClose: () => void; 
  codes: string[]; 
  productName: string;
}) {
  const [search, setSearch] = useState("");
  
  const filteredCodes = useMemo(() => {
    if (!search.trim()) return codes;
    const term = search.toLowerCase().trim();
    return codes.filter(code => code.toLowerCase().includes(term));
  }, [codes, search]);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  if (!open) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-800">Códigos alternativos</h3>
            <p className="text-xs text-gray-500">{codes.length} códigos en total</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-gray-500 
                       hover:bg-gray-100 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-none rounded-xl
                         text-sm text-gray-800 placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white
                         transition"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 
                           hover:text-gray-600 transition"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {search && (
            <p className="text-xs text-gray-500 mt-2">
              {filteredCodes.length} resultado{filteredCodes.length !== 1 ? 's' : ''} encontrado{filteredCodes.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filteredCodes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {filteredCodes.map((code, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 bg-orange-50 text-orange-700 
                             text-sm font-medium rounded-lg border border-orange-100"
                >
                  {code}
                </span>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <Search size={32} className="mb-2 opacity-50" />
              <p className="text-sm">No se encontraron códigos</p>
              <p className="text-xs">Intenta con otro término</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 
                       font-semibold rounded-xl transition"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Sub-modal para descripción completa
function DescriptionModal({ 
  open, 
  onClose, 
  description, 
  productName 
}: { 
  open: boolean; 
  onClose: () => void; 
  description: string; 
  productName: string;
}) {
  if (!open) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
          <div className="min-w-0 flex-1 pr-2">
            <h3 className="font-bold text-gray-800">Descripción</h3>
            <p className="text-xs text-gray-500 truncate">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-gray-500 
                       hover:bg-gray-100 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
          <p className="text-gray-700 text-sm sm:text-base leading-relaxed break-words whitespace-pre-wrap">
            {description}
          </p>
        </div>

        <div className="p-4 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 
                       font-semibold rounded-xl transition"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ProductDetailModal({ open, onClose, product }: ProductDetailModalProps) {
  // ✅ Incluir fixQuantity del contexto
  const { addToCart, updateQuantity, removeFromCart, cart, fixQuantity } = useCart();
  const { isGuest } = useAuth();
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  
  const [showCodesModal, setShowCodesModal] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  
  const [isZoomed, setIsZoomed] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialDistance, setInitialDistance] = useState(0);
  const [initialScale, setInitialScale] = useState(1);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const grupos: Grupo[] = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("grupos") || "[]");
    } catch {
      return [];
    }
  }, []);

  const subgrupos: Subgrupo[] = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("subgrupos") || "[]");
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [open]);

  useEffect(() => {
    setImgError(false);
    resetZoom();
    setShowCodesModal(false);
    setShowDescriptionModal(false);
  }, [product?.codigo]);

  useEffect(() => {
    if (!open) {
      resetZoom();
      setShowCodesModal(false);
      setShowDescriptionModal(false);
    }
  }, [open]);

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsZoomed(false);
  };

  const toggleZoom = () => {
    if (isZoomed) {
      resetZoom();
    } else {
      setScale(2);
      setIsZoomed(true);
    }
  };

  const handleZoomIn = () => {
    const newScale = Math.min(scale + 0.5, 4);
    setScale(newScale);
    setIsZoomed(newScale > 1);
  };

  const handleZoomOut = () => {
    const newScale = Math.max(scale - 0.5, 1);
    setScale(newScale);
    if (newScale === 1) {
      resetZoom();
    }
  };

  const getDistance = (touch1: React.Touch, touch2: React.Touch) => {
    return Math.hypot(
      touch1.clientX - touch2.clientX,
      touch1.clientY - touch2.clientY
    );
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      setInitialDistance(getDistance(e.touches[0], e.touches[1]));
      setInitialScale(scale);
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const newScale = Math.min(Math.max(initialScale * (currentDistance / initialDistance), 1), 4);
      setScale(newScale);
      setIsZoomed(newScale > 1);
      
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      const newX = e.touches[0].clientX - dragStart.x;
      const newY = e.touches[0].clientY - dragStart.y;
      
      const maxPan = (scale - 1) * 100;
      setPosition({
        x: Math.min(Math.max(newX, -maxPan), maxPan),
        y: Math.min(Math.max(newY, -maxPan), maxPan),
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setInitialDistance(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      const maxPan = (scale - 1) * 100;
      setPosition({
        x: Math.min(Math.max(newX, -maxPan), maxPan),
        y: Math.min(Math.max(newY, -maxPan), maxPan),
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    const newScale = Math.min(Math.max(scale + delta, 1), 4);
    setScale(newScale);
    setIsZoomed(newScale > 1);
    
    if (newScale === 1) {
      setPosition({ x: 0, y: 0 });
    }
  };

  if (!product) return null;

  const clean = (v?: string | number | null) => v?.toString().trim() ?? "";
  const nombreGrupo = grupos.find((g) => clean(g.codigo) === clean(product.grupo))?.nombre || "";
  const nombreSubgrupo = subgrupos.find(
    (s) => clean(s.codigo) === clean(product.grupo) && clean(s.subcodigo) === clean(product.subgrupo)
  )?.nombre || "";

  const inCart = cart.find((item) => item.codigo === product.codigo);
  const cantidad = inCart?.cantidad ?? "";

  const imagen = !imgError && product.rutafoto?.trim() ? product.rutafoto.trim() : "/carrito.png";

  const altCodes = product.codigosAlternativos || [];
  const showCodesButton = altCodes.length > 4;
  const visibleCodes = showCodesButton ? altCodes.slice(0, 4) : altCodes;

  const precioVisible = Number(
    product.precioFinal ??
    product.precioBase ??
    product.precio ??
    0
  );

  const maxDescLength = 150;
  const hasLongDescription = (product.detalles?.length || 0) > maxDescLength;
  const descriptionPreview = hasLongDescription 
    ? product.detalles?.slice(0, maxDescLength) + "..." 
    : product.detalles;

  const modalContent = (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] 
                     flex items-end sm:items-center justify-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white text-gray-800 w-full sm:max-w-5xl 
                       sm:rounded-2xl shadow-2xl relative 
                       flex flex-col md:flex-row 
                       h-full sm:h-auto sm:max-h-[90vh]
                       overflow-hidden"
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header móvil */}
            <div className="sm:hidden flex items-center justify-between px-4 py-3 
                            border-b border-gray-100 bg-white flex-shrink-0 z-20">
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center
                           text-gray-600 hover:text-gray-800 
                           hover:bg-gray-100 rounded-full transition"
              >
                <X size={24} />
              </button>
              <span className="text-sm font-medium text-gray-500">Detalles del producto</span>
              <div className="w-10" />
            </div>

            {/* Botón cerrar desktop */}
            <button
              onClick={onClose}
              className="hidden sm:flex absolute top-4 right-4 z-30
                         w-10 h-10 items-center justify-center
                         text-gray-500 hover:text-orange-500 
                         hover:bg-gray-100 rounded-full transition
                         bg-white shadow-md"
            >
              <X size={24} />
            </button>

            {/* Imagen con Zoom */}
            <div 
              ref={imageContainerRef}
              className="flex-shrink-0 md:flex-1 flex items-center justify-center 
                        bg-gray-50 p-4 sm:p-8
                        h-[200px] sm:h-auto sm:min-h-[400px]
                        relative overflow-hidden select-none"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            >
              {/* Zoom controls */}
              <div className="absolute top-2 left-2 sm:top-4 sm:left-4 flex gap-1.5 z-10">
                <button
                  onClick={handleZoomIn}
                  disabled={scale >= 4}
                  className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center 
                             bg-white hover:bg-gray-50 rounded-full shadow-lg 
                             text-gray-600 hover:text-orange-500 transition
                             disabled:opacity-50 disabled:cursor-not-allowed
                             border border-gray-200"
                >
                  <ZoomIn size={18} />
                </button>
                <button
                  onClick={handleZoomOut}
                  disabled={scale <= 1}
                  className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center 
                             bg-white hover:bg-gray-50 rounded-full shadow-lg 
                             text-gray-600 hover:text-orange-500 transition
                             disabled:opacity-50 disabled:cursor-not-allowed
                             border border-gray-200"
                >
                  <ZoomOut size={18} />
                </button>
                {isZoomed && (
                  <button
                    onClick={resetZoom}
                    className="px-3 h-9 sm:h-10 flex items-center justify-center 
                               bg-white hover:bg-gray-50 rounded-full shadow-lg 
                               text-gray-600 hover:text-orange-500 transition
                               text-xs font-medium border border-gray-200"
                  >
                    Reset
                  </button>
                )}
              </div>

              {scale > 1 && (
                <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 
                                bg-black/70 text-white text-xs px-2.5 py-1 
                                rounded-full z-10 font-medium">
                  {Math.round(scale * 100)}%
                </div>
              )}

              <img
                src={imagen}
                alt={product.nombre}
                onError={() => setImgError(true)}
                onClick={() => !isDragging && toggleZoom()}
                draggable={false}
                style={{
                  transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                  cursor: scale > 1 ? 'grab' : 'zoom-in',
                }}
                className={`object-contain w-full h-full max-h-[160px] sm:max-h-[350px] md:max-h-[450px] 
                           transition-transform duration-200
                           ${isDragging ? 'cursor-grabbing' : ''}`}
              />
            </div>

            {/* Contenido */}
            <div className="flex-1 flex flex-col min-h-0 md:max-w-[50%]">
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-8">
                {/* Título */}
                <h2 className="text-xl sm:text-2xl font-bold text-orange-500 mb-3 leading-tight break-words">
                  {product.nombre}
                </h2>

                {!isGuest && (
                  <div className="space-y-4">
                    {/* Código principal */}
                    <div className="inline-block px-3 py-1.5 bg-gray-100 text-gray-700 
                                    text-sm font-mono rounded-lg break-all">
                      {product.codigo}
                    </div>

                    {/* Códigos alternativos */}
                    {altCodes.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2">
                          Códigos alternativos:
                        </p>
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {visibleCodes.map((code, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-orange-50 text-orange-700 
                                         text-xs font-medium rounded-lg border border-orange-100"
                            >
                              {code}
                            </span>
                          ))}
                          {showCodesButton && (
                            <button
                              onClick={() => setShowCodesModal(true)}
                              className="flex items-center gap-1 px-3 py-1 
                                         bg-orange-500 text-white text-xs font-semibold 
                                         rounded-lg hover:bg-orange-600 transition"
                            >
                              <Hash size={12} />
                              Ver {altCodes.length} códigos
                              <ChevronRight size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Info del producto */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      {product.marca && (
                        <p className="text-gray-600 break-words">
                          <span className="font-semibold text-gray-800">Marca:</span> {product.marca}
                        </p>
                      )}
                      {product.modelo && (
                        <p className="text-gray-600 break-words">
                          <span className="font-semibold text-gray-800">Modelo:</span> {product.modelo}
                        </p>
                      )}
                      <p className="text-gray-600 break-words">
                        <span className="font-semibold text-gray-800">Grupo:</span> {nombreGrupo}
                      </p>
                      <p className="text-gray-600 break-words">
                        <span className="font-semibold text-gray-800">Subgrupo:</span> {nombreSubgrupo}
                      </p>
                    </div>

                    {/* Precio y stock */}
                    <div className="bg-gradient-to-r from-orange-50 to-orange-100/50 
                                    rounded-xl p-4 border border-orange-100">
                      <p className="text-2xl sm:text-3xl font-bold text-orange-500">
                        L {precioVisible.toFixed(2)}
                      </p>
                      <p className={`text-sm font-medium mt-1
                        ${(product.stock ?? 0) > 0 ? "text-green-600" : "text-red-500"}`}>
                        {(product.stock ?? 0) > 0 
                          ? `✓ ${product.stock} disponibles` 
                          : "✗ Sin stock"}
                      </p>
                    </div>

                    {/* Descripción */}
                    {product.detalles && (
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-gray-500">Descripción:</p>
                          <button
                            onClick={() => setShowDescriptionModal(true)}
                            className="flex items-center gap-1 text-xs text-orange-500 
                                       hover:text-orange-600 font-medium transition"
                          >
                            <FileText size={12} />
                            Ver completo
                            <ChevronRight size={14} />
                          </button>
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed break-words whitespace-pre-wrap">
                          {descriptionPreview}
                        </p>
                      </div>
                    )}

                    {product.contraindi && (
                      <p className="text-gray-400 text-xs italic break-words">
                        {product.contraindi}
                      </p>
                    )}

                    {product.referencia && (
                      <p className="text-gray-400 text-xs break-words">
                        <span className="font-medium">Referencia:</span> {product.referencia}
                      </p>
                    )}
                  </div>
                )}

                {/* Guest message */}
                {isGuest && (
                  <div className="flex flex-col items-center text-center py-8">
                    <p className="text-gray-500 mb-4">
                      Inicia sesión para ver precios y disponibilidad.
                    </p>
                    <button
                      onClick={() => {
                        onClose();
                        navigate("/");
                      }}
                      className="bg-orange-500 hover:bg-orange-600 text-white font-semibold 
                                 px-8 py-3 rounded-xl transition shadow-lg shadow-orange-500/20"
                    >
                      Iniciar sesión
                    </button>
                  </div>
                )}
              </div>

              {/* ✅ Footer corregido - Acciones del carrito */}
              {!isGuest && (
                <div className="flex-shrink-0 p-4 sm:p-6 border-t border-gray-100 bg-white">
                  {(product.stock ?? 0) > 0 ? (
                    inCart ? (
                      <div className="flex items-center justify-center gap-3">
                        {/* Botón - */}
                        <button
                          onClick={() => {
                            const newQty = Number(cantidad || 1) - 1;
                            if (newQty < 1) {
                              removeFromCart(product.codigo);
                            } else {
                              updateQuantity(product.codigo, newQty);
                            }
                          }}
                          className="w-12 h-12 flex items-center justify-center 
                                     bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-800 
                                     font-bold text-xl transition active:scale-95"
                        >
                          −
                        </button>

                        {/* Input cantidad */}
                        <input
                          type="number"
                          min={1}
                          max={product.stock}
                          value={cantidad}
                          onChange={(e) =>
                            updateQuantity(product.codigo, e.target.value === "" ? "" : Number(e.target.value))
                          }
                          onBlur={() => fixQuantity(product.codigo)}
                          className="w-20 text-center border-2 border-gray-200 rounded-xl 
                                     py-2.5 text-xl font-bold text-gray-800
                                     focus:ring-2 focus:ring-orange-400 focus:border-orange-400 focus:outline-none"
                        />

                        {/* Botón + */}
                        <button
                          onClick={() => {
                            const newQty = Math.min(Number(cantidad || 1) + 1, product.stock ?? 1);
                            updateQuantity(product.codigo, newQty);
                          }}
                          disabled={Number(cantidad) >= (product.stock ?? 1)}
                          className="w-12 h-12 flex items-center justify-center 
                                     bg-orange-500 hover:bg-orange-600 rounded-xl text-white 
                                     font-bold text-xl transition active:scale-95
                                     disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          +
                        </button>

                        {/* Botón eliminar */}
                        <button
                          onClick={() => removeFromCart(product.codigo)}
                          className="w-12 h-12 flex items-center justify-center
                                     text-red-500 hover:text-white hover:bg-red-500
                                     rounded-xl transition border-2 border-red-200 hover:border-red-500"
                          title="Quitar del carrito"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          addToCart({
                            codigo: product.codigo,
                            nombre: product.nombre,
                            precioBase: precioVisible,
                            precioFinal: precioVisible,
                            impuesto1: product.impuesto1 ?? 0,
                            stock: product.stock ?? 0,
                            formafiscal: product.formafiscal ?? 0,
                            imagen: product.rutafoto || "/carrito.png",
                            cantidad: 1,
                          })
                        }
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white 
                                   font-bold text-lg py-4 rounded-xl transition 
                                   shadow-lg shadow-orange-500/25 active:scale-[0.98]"
                      >
                        Agregar al carrito
                      </button>
                    )
                  ) : (
                    <div className="text-center py-3 bg-red-50 rounded-xl border border-red-100">
                      <p className="text-red-500 font-semibold">Sin stock disponible</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* Sub-modals */}
          <AnimatePresence>
            {showCodesModal && (
              <CodesModal
                open={showCodesModal}
                onClose={() => setShowCodesModal(false)}
                codes={altCodes}
                productName={product.nombre}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showDescriptionModal && product.detalles && (
              <DescriptionModal
                open={showDescriptionModal}
                onClose={() => setShowDescriptionModal(false)}
                description={product.detalles}
                productName={product.nombre}
              />
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}