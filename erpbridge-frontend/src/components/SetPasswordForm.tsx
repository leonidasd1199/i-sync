import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { setPassword } from "../services/authService";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

interface SetPasswordFormProps {
  codigoCliente: string;
}

export default function SetPasswordForm({ codigoCliente }: SetPasswordFormProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPasswordValue] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      return setError("Por favor complete todos los campos.");
    }

    // 🧠 Validar formato de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return setError("Ingrese un correo electrónico válido.");
    }

    if (password !== confirmPassword) {
      return setError("Las contraseñas no coinciden.");
    }

    setLoading(true);
    try {
      // ✅ Enviamos 'nuevaPassword' como pide el backend
      const result = await setPassword(codigoCliente, password, email);

      if (
        typeof result?.message === "string" &&
        result.message.toLowerCase().includes("correctamente")
      ) {
        setSuccess("✅ Contraseña guardada correctamente. Redirigiendo...");
        setTimeout(() => navigate("/", { replace: true }), 1500);
      } else {
        setError(result?.message || "Error al guardar la contraseña.");
      }
    } catch (err) {
      console.error(err);
      setError("Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-6">
      {/* 🔙 Botón volver */}
      <div className="flex justify-start mb-2">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-bridge-gray hover:text-bridge-blue transition"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Volver</span>
        </button>
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm text-bridge-gray mb-1 ml-1 font-medium">
          Correo electrónico
        </label>
        <input
          type="email"
          autoComplete="off"  
          placeholder="cliente@ejemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-[#1b223a]/80 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#1E7EB0]/50 border border-[#232b47] shadow-inner placeholder:text-gray-400"
        />
      </div>

      {/* Contraseña */}
      <div className="relative">
        <label className="block text-sm text-bridge-gray mb-1 ml-1 font-medium">
          Nueva contraseña
        </label>
        <input
          autoComplete="new-password" 
          type={showPassword ? "text" : "password"}
          placeholder="Ingrese su nueva contraseña"
          value={password}
          onChange={(e) => setPasswordValue(e.target.value)}
          className="w-full bg-[#1b223a]/80 text-white rounded-lg px-4 py-3 pr-10 outline-none focus:ring-2 focus:ring-[#1E7EB0]/50 border border-[#232b47] shadow-inner placeholder:text-gray-400"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-200 transition"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {/* Confirmar contraseña */}
      <div>
        <label className="block text-sm text-bridge-gray mb-1 ml-1 font-medium">
          Confirmar contraseña
        </label>
        <input
          type="password"
          autoComplete="new-password" 
          placeholder="Repita la contraseña"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full bg-[#1b223a]/80 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#1E7EB0]/50 border border-[#232b47] shadow-inner placeholder:text-gray-400"
        />
      </div>

      {/* Mensajes */}
      <AnimatePresence>
        {error && (
          <motion.p
            key="error-msg"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-red-500 text-sm text-center font-medium mt-1"
          >
            {error}
          </motion.p>
        )}
        {success && (
          <motion.p
            key="success-msg"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-green-400 text-sm text-center font-medium mt-1"
          >
            {success}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Botón principal */}
      <div className="flex justify-center pt-3">
        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ scale: loading ? 1 : 1.02 }}
          whileTap={{ scale: loading ? 1 : 0.98 }}
          transition={{ duration: 0.6 }}
          className={`${
            loading ? "opacity-70 cursor-not-allowed" : "hover:bg-bridge-accent"
          } bg-bridge-blue transition-all duration-500 text-white px-10 py-3 rounded-lg font-semibold shadow-md flex items-center justify-center gap-2`}
        >
          {loading ? (
            <motion.svg
              className="h-5 w-5 text-bridge-accent"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2.7, ease: "linear" }}
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-90"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              ></path>
            </motion.svg>
          ) : (
            "Guardar contraseña"
          )}
        </motion.button>
      </div>
    </form>
  );
}
