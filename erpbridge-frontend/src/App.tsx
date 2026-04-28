import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Productos from "./pages/Productos";
import Pedidos from "./pages/Pedidos";
import SetPasswordPage from "./pages/SetPassword";
import ResetPassword from "./pages/ResetPassword";
import { useAuth } from "./context/AuthContext";

/**
 * 🔐 Rutas privadas del sistema
 * - Solo accesibles si hay token o sesión de invitado
 * - Los invitados solo pueden ver /productos
 */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token, isGuest } = useAuth();
  const location = useLocation();

  // ⛔ EXCLUSIONES: estas rutas NO deben ser protegidas por el guard
  if (
    location.pathname === "/reset-password" ||
    location.pathname === "/set-password"
  ) {
    return <>{children}</>;
  }

  // ❌ No autenticado → redirige a login
  if (!token && !isGuest) {
    return <Navigate to="/" replace />;
  }

  // 🚫 Invitado → solo puede ver productos
  if (isGuest && location.pathname !== "/productos") {
    return <Navigate to="/productos" replace />;
  }

  // ✅ Autenticado o invitado en su página permitida
  return <>{children}</>;
}

export default function App() {

  return (
    <Routes>
      {/* 🟠 Login principal */}
      <Route path="/" element={<Login />} />

      {/* 🟢 Crear contraseña inicial */}
      <Route path="/set-password" element={<SetPasswordPage />} />

      {/* 🔵 Restablecer contraseña vía correo */}
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* 🧭 Dashboard (solo clientes autenticados) */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />

      {/* 📦 Catálogo de productos */}
      <Route
        path="/productos"
        element={
          <PrivateRoute>
            <Productos />
          </PrivateRoute>
        }
      />

      {/* 🧾 Pedidos / Órdenes */}
      <Route
        path="/ordenes"
        element={
          <PrivateRoute>
            <Pedidos />
          </PrivateRoute>
        }
      />

      {/* 🔁 Redirección por defecto */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
