import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

interface PedidoCardProps {
  pedido: any;
  onClick?: () => void;
}

export default function PedidoCard({ pedido, onClick }: PedidoCardProps) {
const esWeb = ["ISY", "ISYNC"].includes(pedido.vendedor);

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.25 }}
      className={`relative bg-gradient-to-br from-gray-50 via-white to-gray-100 
                  rounded-2xl p-5 flex flex-col shadow-md border cursor-pointer select-none
                  ${
                    esWeb
                      ? "border-orange-300 hover:border-orange-400"
                      : "border-green-300 hover:border-green-400"
                  } hover:shadow-xl hover:shadow-orange-100/40 transition-all duration-300`}
    >
      <div
        className={`absolute top-0 left-0 w-full h-[3px] rounded-t-2xl ${
          esWeb ? "bg-orange-400/60" : "bg-green-400/60"
        }`}
      />

      <div className="flex justify-between mb-3 items-center">
        <h3 className="text-lg font-semibold text-gray-800 tracking-tight">
          #{pedido.documento}
        </h3>
        <span className="text-sm text-gray-500 font-medium">{pedido.fecha}</span>
      </div>

      <div className="space-y-1 mb-2">
        <p className="text-gray-700 text-sm">
          <span className="font-medium text-gray-600">Cliente:</span>{" "}
          {pedido.nombrecli}
        </p>
        <p className="text-gray-700 text-sm">
          <span className="font-medium text-gray-600">Vendedor:</span>{" "}
          {pedido.vendedor}
        </p>
      </div>

      <div className="h-[1px] bg-gray-200/80 my-2 rounded-full" />

      <div className="flex justify-between items-center mt-2 text-sm text-gray-600">
        <span>
          Neto:{" "}
          <span className="text-gray-800 font-semibold">
            {pedido.totneto?.toFixed(2)} LPS
          </span>
        </span>
        <span>
          Total:{" "}
          <span
            className={`font-bold ${
              esWeb ? "text-orange-500" : "text-green-600"
            }`}
          >
            {pedido.totalfinal?.toFixed(2)} LPS
          </span>
        </span>
      </div>

      <div className="flex justify-between items-center mt-3">
        <span
          className={`text-xs rounded-full px-2 py-0.5 font-medium shadow-sm border ${
            esWeb
              ? "text-orange-700 bg-orange-100 border-orange-200"
              : "text-green-700 bg-green-100 border-green-200"
          }`}
        >
          {esWeb ? "i.SYNC" : "PSKLOUD"}
        </span>

        <ChevronRight
          className="text-gray-400 group-hover:text-orange-500 transition duration-300"
          size={18}
        />
      </div>

      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-transparent via-transparent to-orange-50/30 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </motion.div>
  );
}
