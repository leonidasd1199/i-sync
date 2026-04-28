import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import type { ReactNode } from "react";

const API_URL = import.meta.env.VITE_API_URL || '/api';

// How often to poll the lightweight version endpoint (ms)
const POLL_INTERVAL = 4000;

export interface CartItem {
  codigo: string;
  nombre: string;
  precioBase: number;
  precioFinal: number;
  impuesto1: number;
  stock: number;
  cantidad: number;
  formafiscal: number;
  imagen?: string;
  orden?: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (codigo: string) => void;
  updateQuantity: (codigo: string, cantidad: number | "") => void;
  fixQuantity: (codigo: string) => void;
  clearCart: () => void;
  subtotal: number;
  isv: number;
  totalFinal: number;
  initialized: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const GUEST_CART_KEY = "guest_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const { clienteCodigo, isGuest } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Last version we've confirmed with the server
  const knownVersionRef = useRef<number>(0);
  const previousClienteRef = useRef<string | null>(null);
  const pollingRef = useRef<number | null>(null);
  const isInitializingRef = useRef(false);
  // Mirror of cart state for reading synchronously outside setState callbacks
  const cartRef = useRef<CartItem[]>([]);

  // ─── Guest cart (localStorage) ───────────────────────────────────────────────

  const loadGuestCart = useCallback((): CartItem[] => {
    try {
      const stored = localStorage.getItem(GUEST_CART_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch { /* ignore */ }
    return [];
  }, []);

  const saveGuestCart = useCallback((items: CartItem[]) => {
    try {
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
    } catch { /* ignore */ }
  }, []);

  // ─── Remote helpers ───────────────────────────────────────────────────────────

  const parseCartItem = useCallback((item: any): CartItem => ({
    codigo:      String(item.codigo || ''),
    nombre:      String(item.nombre || ''),
    precioBase:  parseFloat(item.precioBase)  || 0,
    precioFinal: parseFloat(item.precioFinal) || 0,
    impuesto1:   parseFloat(item.impuesto1)   || 0,
    stock:       parseInt(item.stock)          || 0,
    cantidad:    Math.max(1, parseInt(item.cantidad) || 1),
    formafiscal: parseInt(item.formafiscal)   || 0,
    imagen:      item.imagen || '/carrito.png',
    orden:       item.orden ?? 0,
  }), []);

  // Fetch full cart from server (enriched with live ERP data)
  const fetchRemoteCart = useCallback(async (): Promise<{ items: CartItem[]; version: number } | null> => {
    if (!clienteCodigo) return null;
    try {
      const res = await fetch(`${API_URL}/carrito/${clienteCodigo}`);
      if (!res.ok) return null;
      const data = await res.json();
      const rawItems: any[] = data.items ?? [];
      const version: number = Number(data.version) || 0;
      const items = rawItems.map(parseCartItem);
      return { items, version };
    } catch {
      return null;
    }
  }, [clienteCodigo, parseCartItem]);

  // ─── Initialization ───────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      if (isInitializingRef.current) return;

      const clienteChanged = previousClienteRef.current !== clienteCodigo;
      if (clienteChanged) {
        previousClienteRef.current = clienteCodigo;
        setInitialized(false);
        knownVersionRef.current = 0;
      } else if (initialized) {
        return;
      }

      isInitializingRef.current = true;

      try {
        if (isGuest) {
          setCart(loadGuestCart());
          return;
        }

        if (!clienteCodigo) {
          setCart([]);
          return;
        }

        const remote = await fetchRemoteCart();
        const remoteItems = remote?.items ?? [];
        const remoteVersion = remote?.version ?? 0;

        // If there's a guest cart, merge it into the server cart
        const guestItems = loadGuestCart();
        if (guestItems.length > 0) {
          const merged = new Map<string, CartItem>();
          remoteItems.forEach(i => merged.set(i.codigo, i));
          for (const g of guestItems) {
            const existing = merged.get(g.codigo);
            if (existing) {
              merged.set(g.codigo, {
                ...existing,
                cantidad: Math.min(existing.cantidad + g.cantidad, existing.stock),
              });
            } else {
              merged.set(g.codigo, g);
            }
          }
          const mergedArr = Array.from(merged.values());

          // Persist each new/updated item from guest cart to server
          await Promise.allSettled(
            mergedArr.map(item =>
              fetch(`${API_URL}/carrito/item`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cliente: clienteCodigo, codigo: item.codigo, cantidad: item.cantidad }),
              })
            )
          );
          localStorage.removeItem(GUEST_CART_KEY);

          // Fetch again to get the server version after merge
          const afterMerge = await fetchRemoteCart();
          setCart(afterMerge?.items ?? mergedArr);
          knownVersionRef.current = afterMerge?.version ?? remoteVersion;
        } else {
          setCart(remoteItems);
          knownVersionRef.current = remoteVersion;
        }
      } catch (err) {
        console.error("Error initializing cart:", err);
        setCart([]);
      } finally {
        setInitialized(true);
        isInitializingRef.current = false;
      }
    };

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteCodigo, isGuest]);

  // ─── Version polling (lightweight) ────────────────────────────────────────────
  // Polls only the version number. If it changed, fetches the full cart.

  useEffect(() => {
    if (isGuest || !clienteCodigo || !initialized) return;

    const poll = async () => {
      if (isInitializingRef.current) return;
      try {
        const res = await fetch(`${API_URL}/carrito/version/${clienteCodigo}`);
        if (!res.ok) return;
        const { version } = await res.json();
        const serverVersion = Number(version);

        if (serverVersion > knownVersionRef.current) {
          const remote = await fetchRemoteCart();
          if (remote) {
            setCart(remote.items);
            knownVersionRef.current = remote.version;
          }
        }
      } catch { /* ignore */ }
    };

    pollingRef.current = window.setInterval(poll, POLL_INTERVAL);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [clienteCodigo, isGuest, initialized, fetchRemoteCart]);

  // Keep cartRef in sync with state (for reading current values outside setState)
  useEffect(() => { cartRef.current = cart; }, [cart]);

  // Persist guest cart to localStorage whenever it changes
  useEffect(() => {
    if (isGuest && initialized) {
      saveGuestCart(cart);
    }
  }, [cart, isGuest, initialized, saveGuestCart]);

  // ─── Mutations ────────────────────────────────────────────────────────────────

  const syncItem = useCallback((codigo: string, cantidad: number) => {
    if (isGuest || !clienteCodigo) return;
    fetch(`${API_URL}/carrito/item`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente: clienteCodigo, codigo, cantidad }),
    })
      .then(r => r.json())
      .then(d => { if (d.version) knownVersionRef.current = d.version; })
      .catch(() => {});
  }, [isGuest, clienteCodigo]);

  const syncRemove = useCallback((codigo: string) => {
    if (isGuest || !clienteCodigo) return;
    fetch(`${API_URL}/carrito/item/${clienteCodigo}/${encodeURIComponent(codigo)}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(d => { if (d.version) knownVersionRef.current = d.version; })
      .catch(() => {});
  }, [isGuest, clienteCodigo]);

  const addToCart = useCallback((item: CartItem) => {
    // Read current state via ref — avoids putting the fetch inside the setState callback
    const existing = cartRef.current.find(p => p.codigo === item.codigo);
    const newQty = existing ? Math.min(existing.cantidad + 1, existing.stock) : 1;
    syncItem(item.codigo, newQty);
    setCart(prev => {
      const ex = prev.find(p => p.codigo === item.codigo);
      if (ex) return prev.map(p => p.codigo === item.codigo ? { ...p, cantidad: newQty } : p);
      return [...prev, { ...item, cantidad: 1, orden: prev.length }];
    });
  }, [syncItem]);

  const removeFromCart = useCallback((codigo: string) => {
    syncRemove(codigo);
    setCart(prev => prev.filter(p => p.codigo !== codigo).map((p, i) => ({ ...p, orden: i })));
  }, [syncRemove]);

  const updateQuantity = useCallback((codigo: string, cantidad: number | "") => {
    setCart(prev => prev.map(p => p.codigo === codigo ? { ...p, cantidad: cantidad as any } : p));
  }, []);

  const fixQuantity = useCallback((codigo: string) => {
    const item = cartRef.current.find(p => p.codigo === codigo);
    if (item) {
      let v = Number(item.cantidad);
      if (!v || v < 1) v = 1;
      if (v > item.stock) v = item.stock;
      syncItem(codigo, v);
      setCart(prev => prev.map(p => p.codigo === codigo ? { ...p, cantidad: v } : p));
    }
  }, [syncItem]);

  const clearCart = useCallback(() => {
    setCart([]);
    if (isGuest) {
      localStorage.removeItem(GUEST_CART_KEY);
    } else if (clienteCodigo) {
      fetch(`${API_URL}/carrito/${clienteCodigo}`, { method: 'DELETE' })
        .then(r => r.json()).then(d => { if (d.version) knownVersionRef.current = d.version; }).catch(() => {});
    }
  }, [isGuest, clienteCodigo]);

  // ─── Totals ───────────────────────────────────────────────────────────────────

  const subtotal = cart.reduce((sum, item) => sum + item.precioBase * item.cantidad, 0);

  const isv = cart.reduce((sum, item) => {
    if (item.formafiscal === 3) return sum;
    return sum + item.cantidad * (item.precioFinal - item.precioBase);
  }, 0);

  const totalFinal = subtotal + isv;

  if (!initialized && clienteCodigo && !isGuest) {
    return (
      <CartContext.Provider
        value={{
          cart: [],
          addToCart: () => {},
          removeFromCart: () => {},
          updateQuantity: () => {},
          fixQuantity: () => {},
          clearCart: () => {},
          subtotal: 0,
          isv: 0,
          totalFinal: 0,
          initialized: false,
        }}
      >
        {children}
      </CartContext.Provider>
    );
  }

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, updateQuantity, fixQuantity, clearCart, subtotal, isv, totalFinal, initialized }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
};