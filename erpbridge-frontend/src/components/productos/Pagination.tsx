export default function Pagination({
  page,
  totalPages,
  setPage,
  position = "bottom",
}: any) {
  if (totalPages <= 1) return null;

  return (
    <div
      className={`flex justify-center items-center gap-4 ${
        position === "top" ? "mb-6" : "mt-10"
      } text-sm font-medium text-gray-600`}
    >
      <button
        onClick={() => setPage(page - 1)}
        disabled={page === 1}
        className={`px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm 
                    transition-all duration-300 ease-out
                    ${
                      page === 1
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:border-orange-400 hover:text-orange-600 hover:shadow-md"
                    }`}
      >
        ← Anterior
      </button>

      <span className="px-3 py-1 text-gray-700 font-semibold bg-gray-50 border border-gray-200 rounded-md">
        <span className="text-orange-500 font-bold">Página {page}</span> de {totalPages}
      </span>

      <button
        onClick={() => setPage(page + 1)}
        disabled={page === totalPages}
        className={`px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm 
                    transition-all duration-300 ease-out
                    ${
                      page === totalPages
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:border-orange-400 hover:text-orange-600 hover:shadow-md"
                    }`}
      >
        Siguiente →
      </button>
    </div>
  );
}