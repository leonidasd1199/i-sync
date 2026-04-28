import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CarContext";
import { useState } from "react";
import { motion } from "framer-motion";
import { Trash2, ShoppingCart, Plus, Minus } from "lucide-react";

export default function ProductCard({ producto, openModal }: any) {
  const { isGuest } = useAuth();
  const { cart, addToCart, updateQuantity, removeFromCart, fixQuantity } = useCart();
  const inCart = cart.find((item) => item.codigo === producto.codigo);
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);

  const imagen =
    !imgError && producto.rutafoto?.trim()
      ? producto.rutafoto.trim()
      : "/carrito.png";

  const precioVisible = producto.precioFinal > 0
    ? producto.precioFinal
    : producto.precioBase;

  const sinStock = (producto.stock ?? 0) <= 0;

  return (
    <motion.div
      onClick={() => openModal(producto)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col 
                 cursor-pointer shadow-sm hover:shadow-lg hover:shadow-orange-100/60 
                 transition-all duration-300 hover:border-orange-300 group h-full"
    >
      {/* Contenedor de imagen mejorado */}
      <div className="relative w-full aspect-square bg-gradient-to-br from-gray-50 to-gray-100 
                      flex items-center justify-center overflow-hidden p-2 sm:p-4">
        
        {/* Loading skeleton */}
        {imgLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-orange-400 rounded-full animate-spin" />
          </div>
        )}

        <img
          loading="lazy"
          src={imagen}
          alt={producto.nombre}
          onError={() => {
            setImgError(true);
            setImgLoading(false);
          }}
          onLoad={() => setImgLoading(false)}
          className={`object-contain w-full h-full 
                     transition-all duration-300 group-hover:scale-110
                     ${imgLoading ? 'opacity-0' : 'opacity-100'}`}
        />

        {/* Badge de sin stock */}
        {!isGuest && sinStock && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] 
                          flex items-center justify-center">
            <span className="bg-red-500 text-white text-xs sm:text-sm font-bold 
                           px-3 py-1.5 rounded-full shadow-lg">
              SIN STOCK
            </span>
          </div>
        )}

        {/* Badge de cantidad en carrito */}
        {inCart && (
          <div className="absolute top-2 right-2 bg-orange-500 text-white 
                          w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center 
                          text-xs sm:text-sm font-bold shadow-lg">
            {inCart.cantidad}
          </div>
        )}
      </div>

      {/* Información del producto */}
      <div className="p-3 sm:p-4 flex flex-col flex-grow gap-1 sm:gap-2">
        <h2 className="text-sm sm:text-base font-semibold text-gray-800 
                       leading-tight line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem]">
          {producto.nombre}
        </h2>

        {!isGuest && (
          <>
            <p className="text-[10px] sm:text-xs text-gray-400 font-mono">
              {producto.codigo}
            </p>

            {producto.referencia && (
              <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                <span className="font-medium">Ref:</span> {producto.referencia}
              </p>
            )}

            {producto.marca && (
              <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                <span className="font-medium">Marca:</span> {producto.marca}
              </p>
            )}

            {producto.modelo && (
              <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                <span className="font-medium">Modelo:</span> {producto.modelo}
              </p>
            )}

            <div className="flex items-center justify-between mt-auto pt-2">
              <div className="flex flex-col">
                <span className="text-lg sm:text-xl font-bold text-orange-500">
                  L {precioVisible.toFixed(2)}
                </span>
                <span className={`text-[10px] sm:text-xs font-medium
                  ${sinStock ? 'text-red-500' : 'text-green-600'}`}>
                  {sinStock ? 'Agotado' : `${producto.stock} disponibles`}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Acciones del carrito */}
      {!isGuest && (
        <div className="p-3 sm:p-4 pt-0 mt-auto">
          {!sinStock && !inCart ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="w-full bg-orange-500 hover:bg-orange-600 
                         text-white font-medium py-2.5 sm:py-3 text-sm
                         rounded-xl transition-all duration-200 
                         flex items-center justify-center gap-2 shadow-sm
                         hover:shadow-md active:shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                addToCart({
                  codigo: producto.codigo,
                  nombre: producto.nombre,
                  precioBase: precioVisible,
                  precioFinal: producto.precioFinal ?? 0,
                  impuesto1: producto.impuesto1 ?? 0,
                  stock: producto.stock ?? 0,
                  formafiscal: producto.formafiscal ?? 0,
                  imagen: producto.rutafoto || "/carrito.png",
                  cantidad: 1,
                });
              }}
            >
              <ShoppingCart size={16} />
              <span>Agregar</span>
            </motion.button>
          ) : inCart ? (
            <div className="flex items-center justify-between bg-gray-100 rounded-xl p-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (Number(inCart.cantidad) <= 1) {
                    removeFromCart(producto.codigo);
                  } else {
                    updateQuantity(producto.codigo, Number(inCart.cantidad || 1) - 1);
                    fixQuantity(producto.codigo);
                  }
                }}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center 
                           bg-white hover:bg-red-50 rounded-lg text-gray-600 
                           hover:text-red-500 font-bold transition-all shadow-sm"
              >
                {Number(inCart.cantidad) <= 1 ? <Trash2 size={16} /> : <Minus size={16} />}
              </button>

              <input
                type="number"
                min={1}
                max={producto.stock ?? 1}
                value={inCart.cantidad}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  updateQuantity(producto.codigo, e.target.value === "" ? "" : Number(e.target.value))
                }
                onBlur={() => fixQuantity(producto.codigo)}
                className="w-12 sm:w-16 text-center bg-transparent
                           text-base sm:text-lg font-bold text-gray-800 
                           focus:outline-none"
              />

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateQuantity(producto.codigo, Number(inCart.cantidad || 1) + 1);
                  fixQuantity(producto.codigo);
                }}
                disabled={Number(inCart.cantidad) >= (producto.stock ?? 1)}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center 
                           bg-orange-500 hover:bg-orange-600 rounded-lg text-white 
                           font-bold transition-all shadow-sm
                           disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Plus size={16} />
              </button>
            </div>
          ) : (
            <button
              disabled
              className="w-full bg-gray-200 text-gray-400 font-medium 
                         py-2.5 sm:py-3 text-sm rounded-xl cursor-not-allowed"
            >
              No disponible
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}