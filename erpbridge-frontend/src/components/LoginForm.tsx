import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Eye, EyeOff, Mail, User } from "lucide-react";

export default function LoginForm() {
  const navigate = useNavigate();
  const { login, loginGuest } = useAuth();

  const [codigo, setCodigo] = useState("");
  const [password, setPassword] = useState("");
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  const errorVariants: Variants = {
    hidden: { opacity: 0, y: -5 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
    exit: { opacity: 0, y: -5, transition: { duration: 0.3 } },
  };

  const Spinner = () => (
    <motion.svg
      className="h-6 w-6 text-gray-700"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </motion.svg>
  );

  const onChangeCodigo = (val: string) => {
    setCodigo(val);
    setHasPassword(null);
    setError("");
    setInfo("");
    setPassword("");
  };

  const handleCheckPassword = async () => {
    setError("");
    if (!codigo.trim()) {
      setError("Ingrese el código del cliente.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/check-password/${codigo}`);

      if (!res.ok) {
        let msg = "El código de cliente no existe.";
        try {
          const errJson = await res.json();
          msg =
            typeof errJson?.message === "string"
              ? errJson.message
              : Array.isArray(errJson?.message)
              ? errJson.message[0]
              : msg;
        } catch {}
        setError(msg);
        setHasPassword(null);
        return;
      }

      const data = await res.json();
      if (data.hasPassword) setHasPassword(true);
      else navigate("/set-password", { state: { codigoCliente: codigo } });
    } catch {
      setError("Error al verificar el cliente.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!password.trim()) {
      setError("Ingrese su contraseña.");
      return;
    }

    setLoading(true);
    const result = await login(codigo, password);

    if (result === "success") {
      navigate("/dashboard", { replace: true });
    } else if (result === "need_password_setup") {
      navigate("/set-password", { state: { codigoCliente: codigo } });
    } else if (typeof result === "object" && result.error) {
      setError(result.error);
    } else {
      setError("Error desconocido.");
    }

    setLoading(false);
  };

  const handleForgotPassword = async () => {
    setError("");
    setInfo("");
    setShowPopup(false);

    if (!codigo.trim()) {
      setError("Ingrese su código de cliente antes de solicitar recuperación.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigoCliente: codigo }),
      });

      const data = await res.json();
      if (res.ok) setInfo(data.message || "Correo enviado con éxito.");
      else setError(data.message);
    } catch {
      setError("Error al enviar el correo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={hasPassword ? handleLogin : (e) => e.preventDefault()} className="flex flex-col space-y-6">

        {hasPassword && (
          <button
            type="button"
            onClick={() => {
              setHasPassword(null);
              setPassword("");
              setError("");
            }}
            className="text-sm text-gray-500 hover:text-gray-700 hover:underline flex items-center gap-1"
          >
            ← Volver
          </button>
        )}

        <div>
          <label className="block text-sm text-gray-700 mb-1 ml-1 font-medium">Código del cliente</label>
          <input
            type="text"
            placeholder="Código"
            autoComplete="off"
            value={codigo}
            onChange={(e) => onChangeCodigo(e.target.value)}
            disabled={hasPassword !== null}
            className="w-full bg-white text-gray-800 rounded-lg px-4 py-3 border border-gray-300 placeholder-gray-400 focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 outline-none shadow-sm transition-all duration-300 disabled:opacity-60"
          />
        </div>

        {!hasPassword && (
          <>
            <motion.button
              type="button"
              onClick={handleCheckPassword}
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              transition={{ duration: 0.3 }}
              className={`w-full ${loading ? "opacity-70 cursor-wait" : "hover:bg-orange-500"} bg-orange-400 text-white px-10 py-3 rounded-lg font-semibold shadow-md flex items-center justify-center gap-2 transition-all duration-300`}
            >
              {loading ? <Spinner /> : "Continuar"}
            </motion.button>

            <div className="relative my-2 flex items-center">
              <div className="flex-grow border-t border-gray-200" />
              <span className="px-3 text-sm text-gray-500">o</span>
              <div className="flex-grow border-t border-gray-200" />
            </div>

            <motion.button
              type="button"
              onClick={() => {
                loginGuest();
                navigate("/productos", { replace: true });
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="border border-gray-300 text-gray-600 hover:text-gray-800 hover:border-orange-400 px-10 py-3 rounded-lg font-medium shadow-sm transition-all duration-300 flex items-center justify-center gap-2 bg-white"
            >
              <User size={17} className="opacity-80" />
              Entrar como invitado
            </motion.button>
          </>
        )}

        <AnimatePresence>
          {hasPassword && (
            <motion.div
              key="password-section"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
            >
              <div className="relative">
                <label className="block text-sm text-gray-700 mb-1 ml-1 font-medium">Contraseña</label>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Ingrese su contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white text-gray-800 rounded-lg px-4 py-3 pr-10 border border-gray-300 placeholder-gray-400 focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 outline-none shadow-sm transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[34px] text-gray-500 hover:text-gray-700 transition"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                transition={{ duration: 0.3 }}
                className={`mt-6 ${loading ? "opacity-70 cursor-wait" : "hover:bg-orange-500"} bg-orange-400 text-white px-10 py-3 rounded-lg font-semibold shadow-md flex items-center justify-center gap-2 transition-all duration-300 w-full`}
              >
                {loading ? <Spinner /> : "Ingresar"}
              </motion.button>

              <div className="text-center mt-3">
                <button
                  type="button"
                  onClick={() => setShowPopup(true)}
                  disabled={loading}
                  className="text-sm text-orange-500 hover:underline disabled:opacity-60"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.p
              key="error-msg"
              variants={errorVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="text-red-500 text-sm text-center font-medium mt-1"
            >
              {error}
            </motion.p>
          )}
          {info && (
            <motion.p
              key="info-msg"
              variants={errorVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="text-green-600 text-sm text-center font-medium mt-1"
            >
              {info}
            </motion.p>
          )}
        </AnimatePresence>
      </form>

      <AnimatePresence>
        {showPopup && (
          <motion.div
            className="fixed inset-0 bg-gray-500/40 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white text-gray-800 rounded-2xl shadow-xl p-6 w-[90%] max-w-sm border border-gray-200"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <Mail className="w-10 h-10 text-orange-500" />
                <h2 className="text-lg font-semibold">¿Restablecer contraseña?</h2>
                <p className="text-sm text-gray-600">
                  Enviaremos un enlace al correo del código <b>{codigo}</b>.
                </p>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setShowPopup(false)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleForgotPassword}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition"
                  >
                    Enviar correo
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
