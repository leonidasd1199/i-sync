import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/theme.css";

import { AuthProvider } from "./context/AuthContext";
import { ProductosProvider } from "./context/ProductosContext";
import { CartProvider } from "./context/CarContext";
import { PedidosProvider } from "./context/PedidosContext"; 

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <ProductosProvider>
        <CartProvider>
          <PedidosProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </PedidosProvider>
        </CartProvider>
      </ProductosProvider>
    </AuthProvider>
  </React.StrictMode>
);
