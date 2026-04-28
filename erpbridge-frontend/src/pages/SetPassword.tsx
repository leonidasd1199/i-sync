import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import SetPasswordForm from "../components/SetPasswordForm";

export default function SetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const codigoCliente = location.state?.codigoCliente;

  if (!codigoCliente) {
    navigate("/", { replace: true });
    return null;
  }

  return (
    <div
      className="w-screen h-screen flex items-center justify-center 
                 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-100"
    >
      <motion.div
        initial={{ opacity: 0, y: 200 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        className="bg-gray-50/90 backdrop-blur-md p-10 rounded-2xl shadow-xl 
                   w-[90%] max-w-md border border-gray-300"
      >
        {/* 🔹 Logo + título */}
        <div className="flex flex-col items-center mb-6">
          <motion.img
            src="/inversioneslogo.png"
            alt="Inversiones Logo"
            className="w-44 h-auto select-none mb-4"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          />

          <h1 className="text-3xl font-bold text-gray-800 tracking-wide">
            Crear contraseña
          </h1>
        </div>

        <SetPasswordForm codigoCliente={codigoCliente} />

        <p className="text-sm text-center text-gray-600 mt-6">
          © 2025 <span className="text-orange-500 font-semibold">i.SYNC</span>
        </p>
      </motion.div>
    </div>
  );
}
