// Relation table: only stores which products a client has in their cart + quantity.
// Product data (name, price, stock) is fetched live from the ERP on every cart read.
export const CREATE_CART_RELACION_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS carrito_relacion (
  cliente_codigo VARCHAR(50) NOT NULL,
  codigo_articulo VARCHAR(50) NOT NULL,
  cantidad        INT NOT NULL DEFAULT 1,
  fecha           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (cliente_codigo, codigo_articulo)
);
`;

// One row per client. version is a millisecond timestamp updated on every mutation.
// The frontend compares this value to decide whether to pull a fresh cart.
export const CREATE_CART_VERSION_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS carrito_version (
  cliente_codigo VARCHAR(50) NOT NULL PRIMARY KEY,
  version        BIGINT NOT NULL DEFAULT 0
);
`;
