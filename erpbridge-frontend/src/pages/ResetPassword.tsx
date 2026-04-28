import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { apiRequest } from "../services/authService";

export default function ResetPassword() {

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {

    if (!token) {
      setIsValid(false);
      return;
    }

    const verify = async () => {
      try {

        const res = await apiRequest(
          `/auth/verify-reset-token?token=${token}`,
          {
            skipAuthRedirect: true, // ← ESSENCIAL PARA EVITAR REDIRECT GLOBAL
          }
        );


        if (!res) {
          setIsValid(false);
          return;
        }

        const data = await res.json();

        setIsValid(data.valid);
      } catch (err) {
        setIsValid(false);
      }
    };

    verify();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setMessage("");

    if (!password.trim() || !confirmPassword.trim()) {
      setMessage("Por favor complete ambos campos.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {

      const res = await apiRequest(`/auth/reset-password`, {
        method: "POST",
        skipAuthRedirect: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });


      if (!res) {
        setMessage("No se pudo restablecer la contraseña.");
        return;
      }

      const data = await res.json();

      if (res.ok) {
        setMessage("✅ Contraseña restablecida. Redirigiendo...");
        setTimeout(() => navigate("/", { replace: true }), 2000);
      } else {
        setMessage(data?.message || "No se pudo restablecer la contraseña.");
      }
    } catch (err) {
      setMessage("Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  if (isValid === null) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-lg font-medium">Verificando enlace…</p>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <AlertCircle size={48} className="text-red-500" />
        <h1 className="text-xl font-semibold">Enlace inválido o expirado</h1>
        <p className="text-gray-500">Solicita un nuevo correo desde el login.</p>
        <button
          onClick={() => navigate("/")}
          className="mt-4 bg-orange-500 text-white px-5 py-2 rounded-lg"
        >
          Volver al inicio
        </button>
      </div>
    );
  }


  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white border p-8 rounded-xl shadow-lg w-full max-w-md"
      >
        <h1 className="text-2xl font-bold text-center mb-6">
          Restablecer contraseña
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <label className="block text-sm mb-1">Nueva contraseña</label>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border px-4 py-3 rounded-lg"
              placeholder="Ingrese su nueva contraseña"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-10 text-gray-500"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div>
            <label className="block text-sm mb-1">Confirmar contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border px-4 py-3 rounded-lg"
              placeholder="Repita la contraseña"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white px-6 py-3 rounded-lg"
          >
            {loading ? "Guardando…" : "Guardar contraseña"}
          </button>
        </form>

        <AnimatePresence>
          {message && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm text-center mt-4"
            >
              {message}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
