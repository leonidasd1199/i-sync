import { useState } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, LogIn, Menu } from "lucide-react";
import CartDrawer from "./CartDrawer";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CarContext";

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { logout, clienteNombre, isGuest } = useAuth();
  const navigate = useNavigate();
  const { cart } = useCart();
  const [openCart, setOpenCart] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const handleLoginRedirect = () => {
    navigate("/", { replace: true });
  };

  return (
    <header
      className="bg-gray-100/90 backdrop-blur-sm border-b border-gray-200 
                 px-4 md:px-6 lg:px-8 h-[72px] flex justify-between items-center 
                 shadow-sm relative z-40"
    >
      {/* Botón menú hamburguesa - solo móvil */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-2 text-gray-600 hover:text-orange-500 transition-colors"
      >
        <Menu size={24} />
      </button>

      {/* Spacer para desktop cuando no hay botón menú */}
      <div className="hidden lg:block" />

      <div className="flex items-center gap-3 md:gap-6">
        {/* 🛒 Carrito solo para usuarios autenticados */}
        {!isGuest && (
          <button
            onClick={() => setOpenCart(true)}
            className="relative text-gray-700 hover:text-orange-500 transition-colors"
          >
            <ShoppingCart size={24} className="md:w-[26px] md:h-[26px]" />
            {cart.length > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-3 bg-orange-500 text-white 
                           text-xs font-semibold rounded-full px-1.5 py-0.5 shadow-sm"
              >
                {cart.length}
              </motion.span>
            )}
          </button>
        )}

        {/* 👤 Estado del usuario - oculto en móvil pequeño */}
        {isGuest ? (
          <span className="hidden sm:inline text-sm text-gray-600 italic">
            Estás navegando como{" "}
            <span className="text-orange-500 font-semibold">invitado</span>
          </span>
        ) : (
          <span className="hidden sm:inline text-sm text-gray-700">
            Bienvenido,{" "}
            <span className="text-orange-500 font-semibold">
              {clienteNombre || "Usuario"}
            </span>
          </span>
        )}

        {/* 🔘 Acción de sesión */}
        {isGuest ? (
          <button
            onClick={handleLoginRedirect}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 
                       text-white text-sm font-medium px-3 md:px-4 py-1.5 
                       rounded-md transition-all shadow-sm"
          >
            <LogIn size={16} />
            <span className="hidden sm:inline">Iniciar sesión</span>
          </button>
        ) : (
          <button
            onClick={handleLogout}
            className="bg-orange-500 hover:bg-orange-600 text-white text-sm 
                       font-medium px-3 md:px-4 py-1.5 rounded-md transition-all shadow-sm"
          >
            <span className="sm:hidden">Salir</span>
            <span className="hidden sm:inline">Cerrar sesión</span>
          </button>
        )}
      </div>

      {/* 🔸 Drawer */}
      {!isGuest && <CartDrawer open={openCart} onClose={() => setOpenCart(false)} />}
    </header>
  );
}