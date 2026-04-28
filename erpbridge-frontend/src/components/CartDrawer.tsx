import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, CheckCircle2, AlertCircle, Clock, Mail } from "lucide-react";
import { useCart } from "../context/CarContext";
import { usePedidos } from "../context/PedidosContext";
import { useAuth } from "../context/AuthContext";
import Spinner from "./Spinner";
import { useState } from "react";
import ProductDetailModal from "./ProductDetailModal";

interface Props {
  open: boolean;
  onClose: () => void;
}

type PopupType = "success" | "error" | "warning" | "info";

interface PopupState {
  type: PopupType;
  message: string;
  submessage?: string;
}

// Tipo para el producto seleccionado (compatible con ProductDetailModal)
interface SelectedProduct {
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
}

export default function CartDrawer({ open, onClose }: Props) {
  const { cart, removeFromCart, updateQuantity, clearCart } = useCart();
  const { crearPedido, loading, error } = usePedidos();
  const { clienteCodigo, isGuest } = useAuth();

  const [popup, setPopup] = useState<PopupState | null>(null);
  const [errorImages, setErrorImages] = useState<Record<string, boolean>>({});
  const [notas, setNotas] = useState("");
  
  // Estado para el modal de detalle del producto
  const [selectedProduct, setSelectedProduct] = useState<SelectedProduct | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const showPopup = (type: PopupType, message: string, submessage?: string) => {
    setPopup({ type, message, submessage });
    const duration = type === "warning" ? 5000 : 3500;
    setTimeout(() => setPopup(null), duration);
  };

  // Función para abrir el modal de detalle
  const handleOpenProductDetail = (item: typeof cart[0]) => {
    const product: SelectedProduct = {
      codigo: item.codigo,
      nombre: item.nombre,
      precioBase: item.precioBase,
      precioFinal: item.precioFinal,
      stock: item.stock,
      impuesto1: item.impuesto1,
      rutafoto: item.imagen,
      formafiscal: item.formafiscal,
    };
    setSelectedProduct(product);
    setIsDetailModalOpen(true);
  };

  const handleCloseProductDetail = () => {
    setIsDetailModalOpen(false);
    setSelectedProduct(null);
  };

  const handleCreateOrder = async () => {
    if (isGuest) return;
    if (!clienteCodigo) {
      showPopup("error", "No se pudo determinar el código del cliente.");
      return;
    }

    const result = await crearPedido("WEB", notas || "");

    if (!result) {
      showPopup("error", error || "Error al crear el pedido.");
      return;
    }

    // Caso 1: Pedido creado exitosamente
    if (result.success) {
      const emailMsg = result.emailEnviandose
        ? "Recibirás un correo con los detalles."
        : undefined;

      showPopup(
        "success",
        `¡Pedido #${result.documento} creado!`,
        emailMsg
      );
      clearCart();
      setNotas("");
      onClose();
      return;
    }

    // Caso 2: Backend caído pero pedido guardado para reintento
    if (result.storedInRedis) {
      if (result.tipoError === "BACKEND_CAIDO") {
        showPopup(
          "warning",
          "Sistema temporalmente no disponible",
          "Tu pedido fue guardado y se procesará automáticamente."
        );
      } else {
        showPopup(
          "warning",
          "Pedido en cola",
          result.mensaje || "Se procesará en breve."
        );
      }
      clearCart();
      setNotas("");
      onClose();
      return;
    }

    // Caso 3: Error real
    showPopup(
      "error",
      result.mensaje || result.error || "Error al crear el pedido."
    );
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + item.precioBase * Number(item.cantidad),
    0
  );

  const isv = cart.reduce((sum, item) => {
    if (item.formafiscal === 3) return sum;
    return sum + (item.precioFinal - item.precioBase) * Number(item.cantidad);
  }, 0);

  const totalFinal = subtotal + isv;

  const getPopupStyles = (type: PopupType) => {
    switch (type) {
      case "success":
        return "bg-green-50 text-green-700 border-green-200";
      case "error":
        return "bg-red-50 text-red-600 border-red-200";
      case "warning":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "info":
        return "bg-blue-50 text-blue-600 border-blue-200";
    }
  };

  const getPopupIcon = (type: PopupType) => {
    switch (type) {
      case "success":
        return <CheckCircle2 size={20} />;
      case "error":
        return <AlertCircle size={20} />;
      case "warning":
        return <Clock size={20} />;
      case "info":
        return <Mail size={20} />;
    }
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-gray-500/40 z-40 backdrop-blur-sm"
              onClick={onClose}
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-0 right-0 h-screen w-full sm:w-96 bg-white shadow-2xl border-l border-gray-200 z-[60] flex flex-col"
            >
              <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-800">Tu carrito</h2>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                  <X size={22} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {cart.length === 0 ? (
                  <p className="text-gray-500 text-center mt-10">Tu carrito está vacío 🛒</p>
                ) : (
                  cart.map((item) => {
                    const imagen =
                      !errorImages[item.codigo] && item.imagen
                        ? item.imagen
                        : "/carrito.png";

                    return (
                      <div key={item.codigo} className="flex items-center gap-3 border-b border-gray-200 pb-3">
                        {/* Imagen clickeable */}
                        <img
                          src={imagen}
                          alt={item.nombre}
                          onError={() =>
                            setErrorImages((prev) => ({ ...prev, [item.codigo]: true }))
                          }
                          onClick={() => handleOpenProductDetail(item)}
                          className="w-14 h-14 rounded-md object-contain bg-gray-100 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity hover:ring-2 hover:ring-orange-300"
                        />

                        <div className="flex flex-col flex-1 min-w-0">
                          {/* Nombre clickeable */}
                          <p 
                            onClick={() => handleOpenProductDetail(item)}
                            className="text-sm font-medium text-gray-800 truncate max-w-[180px] cursor-pointer hover:text-orange-500 transition-colors"
                          >
                            {item.nombre}
                          </p>
                          <p className="text-orange-500 text-sm font-semibold mt-0.5">
                            {item.precioBase.toFixed(2)} LPS
                          </p>

                          <div className="flex items-center mt-1">
                            <button
                              onClick={() =>
                                updateQuantity(item.codigo, Math.max(Number(item.cantidad) - 1, 1))
                              }
                              className="px-2 bg-gray-100 rounded-l-md text-gray-700 hover:bg-gray-200 border border-gray-300"
                            >
                              −
                            </button>

                            <input
                              type="number"
                              min={1}
                              max={item.stock}
                              value={item.cantidad}
                              onChange={(e) =>
                                updateQuantity(
                                  item.codigo,
                                  e.target.value === "" ? 1 : Number(e.target.value)
                                )
                              }
                              className="w-10 text-center bg-white border-y border-gray-300 text-sm text-gray-800"
                            />

                            <button
                              onClick={() =>
                                updateQuantity(item.codigo, Number(item.cantidad) + 1)
                              }
                              className="px-2 bg-gray-100 rounded-r-md text-gray-700 hover:bg-gray-200 border border-gray-300"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.codigo)}
                          className="text-red-500 hover:text-red-600 flex-shrink-0"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  {/* NOTAS */}
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Notas del pedido (opcional)
                    </label>
                    <textarea
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      placeholder=""
                      className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none resize-none"
                      rows={2}
                      maxLength={300}
                    />
                    <p className="text-xs text-gray-400 text-right">{notas.length}/300</p>
                  </div>

                  <div className="space-y-1 mb-3 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span>{subtotal.toFixed(2)} LPS</span>
                    </div>

                    <div className="flex justify-between text-gray-600">
                      <span>ISV</span>
                      <span>{isv.toFixed(2)} LPS</span>
                    </div>

                    <div className="flex justify-between font-semibold text-gray-800 text-base border-t pt-2">
                      <span>Total</span>
                      <span className="text-orange-500 text-lg">{totalFinal.toFixed(2)} LPS</span>
                    </div>
                  </div>

                  <button
                    onClick={handleCreateOrder}
                    disabled={loading}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 rounded-lg transition-all duration-300 disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Spinner size={22} />
                        Procesando...
                      </>
                    ) : (
                      "Completar pedido"
                    )}
                  </button>

                  <button
                    onClick={clearCart}
                    disabled={loading}
                    className="w-full text-sm text-gray-500 hover:text-red-500 mt-2 disabled:opacity-50"
                  >
                    Vaciar carrito
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Popup mejorado con soporte para submensajes */}
      <AnimatePresence>
        {popup && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className={`fixed top-6 left-1/2 transform -translate-x-1/2 px-5 py-3 rounded-xl shadow-lg flex items-start gap-3 text-sm font-medium z-[9999] border max-w-sm ${getPopupStyles(popup.type)}`}
          >
            <span className="mt-0.5 flex-shrink-0">{getPopupIcon(popup.type)}</span>
            <div className="flex flex-col">
              <span>{popup.message}</span>
              {popup.submessage && (
                <span className="text-xs opacity-80 mt-0.5 font-normal">
                  {popup.submessage}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ProductDetailModal
        open={isDetailModalOpen}
        onClose={handleCloseProductDetail}
        product={selectedProduct}
      />
    </>
  );
}