import { motion } from "framer-motion";
import LoginForm from "../components/LoginForm";

export default function Login() {
  return (
    <div
      className="w-screen min-h-screen flex items-center justify-center 
                 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-100
                 p-4 sm:p-6"
    >
      <motion.div
        initial={{ opacity: 0, y: 200 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 1.6,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="bg-gray-50/90 backdrop-blur-md p-6 sm:p-8 md:p-10 
                   rounded-xl sm:rounded-2xl shadow-xl 
                   w-full max-w-md border border-gray-300"
      >
        {/* Logo animado */}
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <motion.img
            src="/inversioneslogo.png"
            alt="Inversiones Logo"
            className="w-36 sm:w-44 md:w-48 h-auto mt-2 select-none"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        {/* Formulario */}
        <LoginForm />

        <p className="text-xs sm:text-sm text-center text-gray-600 mt-4 sm:mt-6">
          © 2025 i.SYNC — todos los derechos reservados
        </p>
      </motion.div>
    </div>
  );
}