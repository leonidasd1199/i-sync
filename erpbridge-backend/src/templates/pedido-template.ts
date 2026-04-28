import { readFileSync } from "fs";
import * as path from "path";

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const buildPedidoHtml = (
  clienteNombre: string,
  documento: string,
  subtotal: number,
  impuestoTotal: number,
  totalFinal: number,
  detalles: any[],
  empresaNombre: string,
  formafiscal: number,
  notas?: string
) => {
  const logoPath = path.join(process.cwd(), "public", "inversioneslogo.png");
  const base64Logo = `data:image/png;base64,${
    readFileSync(logoPath, { encoding: "base64" })
  }`;

  const fecha = new Date();
  const fechaStr = fecha.toLocaleDateString("es-HN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const horaStr = fecha.toLocaleTimeString("es-HN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const ORANGE = "rgb(249 115 22)";

  const rows = detalles
    .map((d, i) => {
      const base = Number(d.precioBase).toFixed(2);
      const impuestoUnit =
        formafiscal === 3 ? "0.00" : Number(d.impuestoLinea / d.cantidad).toFixed(2);

      const finalUnit = (Number(d.precioUnitario) + Number(impuestoUnit)).toFixed(2);
      const totalLinea = Number(d.totalLinea).toFixed(2);

      return `
      <tr>
        <td class="center">${i + 1}</td>
        <td>${escapeHtml(d.codigo)}</td>
        <td>${escapeHtml(d.nombre)}</td>
        <td class="center">${d.cantidad}</td>
        <td class="right nowrap">L. ${base}</td>
        <td class="right nowrap">L. ${impuestoUnit}</td>
        <td class="right nowrap">L. ${finalUnit}</td>
        <td class="right nowrap">L. ${totalLinea}</td>
      </tr>`;
    })
    .join("");

  // Sección de notas (solo si hay notas)
  const notasSection = notas && notas.trim()
    ? `
      <h3 class="section-title" style="margin-top:25px;">Notas</h3>
      <div style="padding:12px 14px;border:1px solid rgba(249,115,22,0.2);
      background:#fff9f5;border-radius:8px;font-size:13px;line-height:1.5;white-space:pre-wrap;">
        ${escapeHtml(notas.trim())}
      </div>
    `
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Pedido ${documento}</title>
<style>
body{
  font-family: 'Inter', Arial, sans-serif;
  background:#fff;
  color:#1f2937;
  padding:32px;
  font-size:14px;
}
.wrapper{
  max-width:820px;
  margin:auto;
  background:white;
  border-radius:16px;
  border:1px solid #e5e7eb;
  box-shadow:0 4px 20px rgba(0,0,0,0.06);
}
.header{
  padding:30px;
  display:flex;
  justify-content:space-between;
  border-bottom:2px solid ${ORANGE};
}
.logo-wrapper{
  display:flex;
  flex-direction:column;
  gap:10px;
}
.logo{width:150px;}
.order-badge{
  padding:4px 12px;
  background:${ORANGE};
  color:white;
  font-size:11px;
  border-radius:6px;
  font-weight:500;
}
.header-right{
  text-align:right;
  font-size:13px;
  opacity:.75;
}
.section-title{
  font-size:13px;
  font-weight:600;
  color:${ORANGE};
  text-transform:uppercase;
  margin-bottom:10px;
}
.table-wrapper{
  border:1px solid #eee;
  border-radius:10px;
  overflow:hidden;
  margin-top:12px;
}
table{
  width:100%;
  border-collapse:collapse;
  font-size:12px;
}
thead{
  background:#fafafa;
}
th{
  padding:8px;
  text-align:center;
  font-weight:600;
  color:${ORANGE};
  border-bottom:1px solid #eee;
}
td{
  padding:6px;
  border-bottom:1px solid #f1f1f1;
}
.right{text-align:right;}
.center{text-align:center;}
.nowrap{white-space:nowrap;}
.summary{
  width:250px;
  margin-left:auto;
  margin-top:20px;
  font-size:13px;
}
.summary div{
  display:flex;
  justify-content:space-between;
  padding:6px 0;
}
.summary .total{
  font-size:15px;
  font-weight:700;
  border-top:1px solid #ddd;
  margin-top:8px;
  padding-top:8px;
  color:${ORANGE};
}
.footer{
  padding:18px 32px;
  border-top:1px solid #eee;
  margin-top:40px;
  font-size:10px;
  opacity:.65;
  display:flex;
  justify-content:space-between;
}
</style>
</head>

<body>
<div class="wrapper">

<div class="header">
  <div class="logo-wrapper">
    <img src="${base64Logo}" class="logo" />
    <div class="order-badge">Pedido #${documento}</div>
  </div>
  <div class="header-right">
    ${fechaStr}<br/>
    ${horaStr}
  </div>
</div>

<div style="padding:30px;">
  <h3 class="section-title">Cliente</h3>
  <div style="padding:10px 14px;border:1px solid rgba(249,115,22,0.2);
  background:#fff9f5;border-radius:8px;">
    ${escapeHtml(clienteNombre)}
  </div>

  <h3 class="section-title" style="margin-top:25px;">Productos</h3>
  <div class="table-wrapper">
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Código</th>
          <th style="text-align:left;">Producto</th>
          <th>Cant.</th>
          <th>Precio</th>
          <th>ISV</th>
          <th>Final</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  ${notasSection}

  <div class="summary">
    <div><span>Subtotal:</span><span>L. ${subtotal.toFixed(2)}</span></div>
    <div><span>ISV:</span><span>L. ${impuestoTotal.toFixed(2)}</span></div>
    <div class="total"><span>Total:</span><span>L. ${totalFinal.toFixed(2)}</span></div>
  </div>
</div>

<div class="footer">
  <span>Documento generado automáticamente</span>
  <span>i.SYNC</span>
</div>

</div>
</body>
</html>`;
};
