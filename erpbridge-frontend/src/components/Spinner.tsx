import { motion } from "framer-motion";

/**
 * Simple animated spinner component using Framer Motion.
 * Used across the Productos module (and can be reused globally).
 */
export default function Spinner({ size = 40 }: { size?: number }) {
  return (
    <motion.svg
      className="text-bridge-accent"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
      style={{ width: size, height: size }}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        className="opacity-25"
      />
      <path
        fill="currentColor"
        className="opacity-90"
        d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
      />
    </motion.svg>
  );
}
