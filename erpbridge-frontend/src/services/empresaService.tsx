const API_URL = import.meta.env.VITE_API_URL || "https://api.isync.site/api";

export interface Empresa {
  idEmpresa: string;
  nombre: string;
}

export interface Agencia {
  agencia: string;
  nombre: string;
}

/**
 * Fetch all companies from backend
 */
export async function getEmpresas(): Promise<Empresa[]> {
  try {
    const res = await fetch(`${API_URL}/empresas`);
    if (!res.ok) throw new Error("Failed to fetch companies");
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ Error al obtener empresas:", error);
    return [];
  }
}

/**
 * Fetch agencies (filtered by company if provided)
 */
export async function getAgencias(empresaId?: string): Promise<Agencia[]> {
  try {
    const endpoint = empresaId
      ? `${API_URL}/agencias/empresa/${empresaId}` // ✅ correct order
      : `${API_URL}/agencias`;

    const res = await fetch(endpoint);
    if (!res.ok) throw new Error("Failed to fetch agencies");
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("💥 Error al obtener agencias:", error);
    return [];
  }
}
