import { X, Search } from "lucide-react";

export default function PedidoFilters({
  search,
  setSearch,
}: {
  search: string;
  setSearch: (v: string) => void;
}) {
  return (
    <div className="flex justify-between items-center mb-6">

      <div className="relative w-64">
        <input
          type="text"
          placeholder="Buscar por documento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 rounded-lg w-full bg-white border border-gray-300 
                     text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-orange-400/50
                     focus:border-orange-400 outline-none transition-all duration-300 pr-10
                     shadow-sm hover:border-gray-400"
        />

        {search ? (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
          >
            <X size={16} />
          </button>
        ) : (
          <Search
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
        )}
      </div>
    </div>
  );
}
