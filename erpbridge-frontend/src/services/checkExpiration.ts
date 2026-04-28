const PUBLIC_ROUTES = [
  "/auth/login",
  "/auth/check-password",
  "/auth/set-password",
  "/auth/forgot-password",
  "/auth/verify-reset-token",
  "/auth/reset-password",
];

const PUBLIC_PAGES = [
  "/reset-password",
  "/set-password",
  "/",
];

export async function checkExpiration(url: string, options: any = {}) {
  // Si es una ruta de API pública, no verificar auth
  if (PUBLIC_ROUTES.some((route) => url.includes(route))) {
    return fetch(url, options);
  }

  // Si estamos en una página pública, no hacer redirect en 401
  const isPublicPage = PUBLIC_PAGES.some((page) => 
    window.location.pathname === page || window.location.pathname.startsWith(page)
  );

  const response = await fetch(url, options);

  if (response.status === 401 && !isPublicPage) {
    localStorage.removeItem("token");
    localStorage.removeItem("clienteNombre");
    localStorage.removeItem("clienteCodigo");
    localStorage.removeItem("isGuest");

    if (window.location.pathname !== "/") {
      window.location.href = "/";
    }

    return null;
  }

  return response;
}