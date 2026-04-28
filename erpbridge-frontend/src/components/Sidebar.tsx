import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Box,
  ClipboardList,
  LogOut,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const [expanded, setExpanded] = useState(true);
  const { isGuest, logout } = useAuth();

  const visibleLinks = isGuest
    ? [{ name: "Productos", to: "/productos", icon: Box }]
    : [
        { name: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
        { name: "Productos", to: "/productos", icon: Box },
        { name: "Órdenes", to: "/ordenes", icon: ClipboardList },
      ];

  // En desktop usa expanded, en móvil siempre expandido
  const isExpanded = expanded;

  return (
    <aside
      className={`
        ${isExpanded ? "w-64" : "w-20"} 
        bg-gray-50 border-r border-gray-300 h-screen 
        flex flex-col shadow-sm transition-all duration-300
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-[72px] border-b border-gray-300 bg-gray-100/80 backdrop-blur-sm">
        <motion.img
          src="/inversioneslogo.png"
          alt="Inversiones Logo"
          className={`transition-all duration-300 select-none ${
            isExpanded ? "w-36 opacity-100" : "w-0 opacity-0"
          }`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />

        <div className="flex items-center gap-2">
          {/* Toggle expandir/colapsar - SOLO desktop */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="hidden lg:flex items-center justify-center w-8 h-8 
                       text-gray-500 hover:text-orange-500 hover:bg-gray-200 
                       rounded-lg transition-all"
          >
            {expanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>

          {/* Botón cerrar - SOLO móvil */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden text-gray-500 hover:text-orange-500 transition-colors p-1"
            >
              <X size={22} />
            </button>
          )}
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex flex-col mt-4 space-y-1 px-2 flex-grow">
        {visibleLinks.map(({ name, icon: Icon, to }) => (
          <NavLink
            key={name}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 ${
                isExpanded ? "justify-start" : "justify-center"
              } ${
                isActive
                  ? "bg-orange-50 text-orange-600 font-medium border border-orange-100"
                  : "text-gray-700 hover:text-orange-500 hover:bg-gray-100"
              }`
            }
            title={!isExpanded ? name : undefined}
          >
            <Icon size={20} className="min-w-[20px] flex-shrink-0" />
            <span
              className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
                isExpanded
                  ? "opacity-100 translate-x-0 w-auto"
                  : "opacity-0 translate-x-[-10px] w-0"
              }`}
            >
              {name}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      {!isGuest && (
        <div className="border-t border-gray-300 mt-auto px-2 py-3 bg-gray-100/80">
          <button
            onClick={logout}
            className={`flex items-center gap-3 w-full text-sm text-red-500 
                        hover:text-red-600 hover:bg-red-50 px-3 py-2.5 rounded-lg 
                        transition-all ${isExpanded ? "justify-start" : "justify-center"}`}
            title={!isExpanded ? "Cerrar sesión" : undefined}
          >
            <LogOut size={20} className="flex-shrink-0" />
            <span
              className={`transition-all duration-300 whitespace-nowrap overflow-hidden ${
                isExpanded
                  ? "opacity-100 translate-x-0 w-auto"
                  : "opacity-0 translate-x-[-10px] w-0"
              }`}
            >
              Cerrar sesión
            </span>
          </button>
        </div>
      )}
    </aside>
  );
}