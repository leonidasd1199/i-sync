import DashboardLayout from "../layout/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import { Package, ShoppingBag, User } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export default function Dashboard() {
  const { clienteNombre } = useAuth();
  const navigate = useNavigate();

  const [totales, setTotales] = useState({ total: 0, conStock: 0, sinStock: 0 });
  const [pedidosData, setPedidosData] = useState({
    totalPedidos: 0,
    totalFacturado: 0,
    chart: [] as any[],
  });
  const [loading, setLoading] = useState(true);

  const fetchTotalesProductos = async () => {
    try {
      setLoading(true);
      const base = import.meta.env.VITE_API_URL;
      const res = await api(`${base}/articulos/totales?empresa=001000&agencia=001`);
      if (!res.ok) throw new Error("Error al obtener totales de productos");
      const data = await res.json();
      setTotales({
        total: data?.total ?? 0,
        conStock: data?.conStock ?? 0,
        sinStock: data?.sinStock ?? 0,
      });
    } catch {
      setTotales({ total: 0, conStock: 0, sinStock: 0 });
    } finally {
      setLoading(false);
    }
  };

  const fetchPedidosDashboard = async () => {
    try {
      const base = import.meta.env.VITE_API_URL;
      const res = await api(`${base}/pedidos/totales?empresa=001000`);
      if (!res.ok) throw new Error("Error al obtener pedidos");
      const data = await res.json();
      setPedidosData({
        totalPedidos: data?.totalPedidos ?? 0,
        totalFacturado: data?.totalFacturado ?? 0,
        chart: Array.isArray(data?.chart) ? data.chart : [],
      });
    } catch {
      setPedidosData({ totalPedidos: 0, totalFacturado: 0, chart: [] });
    }
  };

  useEffect(() => {
    fetchTotalesProductos();
    fetchPedidosDashboard();
  }, []);

  const { total = 0, conStock = 0, sinStock = 0 } = totales;
  const { totalPedidos = 0, chart = [] } = pedidosData;

  const dataStock = useMemo(
    () => [
      { name: "Con stock", value: conStock ?? 0 },
      { name: "Sin stock", value: sinStock ?? 0 },
    ],
    [conStock, sinStock]
  );

  const COLORS = ["#f97316", "#9ca3af"];

  const Spinner = () => (
    <motion.div
      className="relative w-6 h-6"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
    >
      <div className="absolute inset-0 rounded-full border-2 border-t-orange-500 border-gray-300" />
    </motion.div>
  );

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 text-gray-800 bg-gray-100 min-h-screen rounded-xl md:rounded-2xl">
        {/* Header */}
        <div className="flex flex-col items-center mb-6 md:mb-10">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2 text-center">
            Resumen general
          </h1>
          <p className="text-sm text-gray-500">
            Bienvenido, <span className="text-orange-500 font-medium">{clienteNombre}</span>
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-10">
          {/* Usuario */}
          <motion.div
            whileHover={{ scale: 1.03 }}
            className="flex items-center gap-3 md:gap-4 bg-white border border-gray-200 
                       rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm"
          >
            <div className="bg-orange-100 p-2.5 md:p-3 rounded-lg md:rounded-xl">
              <User className="w-6 h-6 md:w-8 md:h-8 text-orange-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-500">Usuario</p>
              <p className="text-lg md:text-2xl font-bold text-gray-800 truncate">
                {clienteNombre || "Invitado"}
              </p>
            </div>
          </motion.div>

          {/* Productos */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            onClick={() => navigate("/productos")}
            className="flex items-center gap-3 md:gap-4 bg-white border border-gray-200 
                       rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm cursor-pointer 
                       hover:border-orange-300 transition-all text-left"
          >
            <div className="bg-orange-100 p-2.5 md:p-3 rounded-lg md:rounded-xl">
              <Package className="w-6 h-6 md:w-8 md:h-8 text-orange-500" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500">Productos</p>
              <div className="h-6 md:h-7 flex items-center justify-start">
                {loading ? (
                  <Spinner />
                ) : (
                  <p className="text-lg md:text-2xl font-bold text-gray-800">
                    {(total ?? 0).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </motion.button>

          {/* Órdenes */}
          <motion.div
            whileHover={{ scale: 1.03 }}
            onClick={() => navigate("/ordenes")}
            className="flex items-center gap-3 md:gap-4 bg-white border border-gray-200 
                       rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm cursor-pointer 
                       hover:border-orange-300 transition-all sm:col-span-2 lg:col-span-1"
          >
            <div className="bg-orange-100 p-2.5 md:p-3 rounded-lg md:rounded-xl">
              <ShoppingBag className="w-6 h-6 md:w-8 md:h-8 text-orange-500" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500">Órdenes Recientes</p>
              <p className="text-lg md:text-2xl font-bold text-gray-800">
                {(totalPedidos ?? 0).toLocaleString()}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-10">
          {/* Line Chart */}
          <div className="bg-white border rounded-xl md:rounded-2xl shadow-sm p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4 text-center">
              Órdenes por mes
            </h2>
            {!chart || chart.length === 0 ? (
              <p className="text-center text-gray-500 italic mt-12">No hay datos recientes</p>
            ) : (
              <ResponsiveContainer width="100%" height={250} className="md:!h-[300px]">
                <LineChart data={chart}>
                  <CartesianGrid stroke="#e5e7eb" vertical={false} />
                  <XAxis 
                    dataKey="mes" 
                    stroke="#6b7280" 
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} width={40} />
                  <Tooltip contentStyle={{ backgroundColor: "white", borderRadius: 8 }} />
                  <Line
                    type="monotone"
                    dataKey="ordenes"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pie Chart */}
          <div className="bg-white border rounded-xl md:rounded-2xl shadow-sm p-4 md:p-6 flex flex-col items-center">
            <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4 md:mb-6">
              Disponibilidad
            </h2>
            {loading ? (
              <div className="flex items-center justify-center h-[250px] md:h-[300px]">
                <Spinner />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250} className="md:!h-[300px]">
                <PieChart>
                    <Pie
                      data={dataStock}
                      cx="50%"
                      cy="50%"
                      outerRadius={typeof window !== "undefined" && window.innerWidth < 640 ? 70 : 100}
                      dataKey="value"
                      label={({ name, percent }: Record<string, unknown>) => 
                        `${name}: ${(Number(percent) * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {dataStock.map((_, i) => (
                        <Cell key={i} fill={COLORS[i]} />
                      ))}
                    </Pie>
                  <Legend wrapperStyle={{ fontSize: "14px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}