import { Pedido, Cliente, Prenda } from '../types';

const formatCOP = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(val);
};

export const printOrderReceipt = (
  order: Pedido,
  clientes: Cliente[],
  catalogGarments: Prenda[]
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('No se pudo abrir la ventana de impresión.');
    return;
  }

  const client = clientes.find(c => c.id === order.clienteId);
  const clientAddress = client ? client.direccion : 'No registrada';
  const clientCity = client ? client.ciudad : '';

  const fe = order.facturacionFE !== undefined ? order.facturacionFE : 100;
  const rm = order.facturacionRM !== undefined ? order.facturacionRM : 0;
  const printFacturacion = fe === 100 ? "FE 100%" : `FE ${fe}% / RM ${rm}%`;

  const totalUnidades = order.items.reduce((sum, item) => sum + item.cantidad, 0);
  const totalReferencias = order.items.length;

  const itemsRows = order.items.map(item => {
    const garment = catalogGarments?.find(g => g.ref === item.prendaRef);
    const skuCode = garment ? garment.ref : item.prendaRef;
    const cleanTalla = item.talla.replace(/\s*\((\d+)\)/g, '-$1');
    return `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px 0; font-weight: bold; font-size: 13px; font-family: monospace;">
          ${skuCode}
        </td>
        <td style="text-align: center; font-weight: bold; white-space: nowrap;">${cleanTalla}</td>
        <td style="text-align: center; font-style: italic; color: #666;">${item.novedad || '-'}</td>
        <td style="text-align: center; font-weight: bold;">${item.cantidad}</td>
        <td style="text-align: right; font-family: monospace;">${formatCOP(item.precioUnitario)}</td>
        <td style="text-align: right; font-weight: bold; font-family: monospace;">${formatCOP(item.total)}</td>
      </tr>
    `;
  }).join('');

  const htmlContent = `
    <html>
      <head>
        <title>Pedido ${order.numeroPedido} - ARARE S.A.S.</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; padding: 30px; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; border-b: 2px solid #333; padding-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; margin: 0; font-family: sans-serif; }
          .meta-grid { display: flex; flex-direction: row; gap: 20px; margin: 30px 0; }
          .meta-box { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
          .meta-title { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #777; margin-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { border-bottom: 2px solid #ddd; padding-bottom: 8px; font-size: 11px; text-transform: uppercase; color: #555; }
          .total-section { float: right; width: 300px; margin-top: 30px; }
          .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; }
          .grand-total { border-top: 2px solid #333; padding-top: 10px; font-size: 16px; font-weight: bold; }
          .footer { clear: both; margin-top: 40px; text-align: center; font-size: 11px; color: #555; border-top: 1.5px solid #bbb; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title" style="font-family: sans-serif; letter-spacing: -0.5px;">ARARE S.A.S.</div>
            <div style="font-size: 12px; font-weight: bold; color: #444; margin-top: 2px;">Nit: 901453438</div>
            <div style="font-size: 11px; color: #666; margin-top: 1px;">Itagüí (ANT)</div>
            <div style="font-size: 11px; color: #555; margin-top: 4px; font-weight: 500;">Toma de Pedidos para Clientes</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 18px; font-weight: bold; color: #111;">PEDIDO</div>
            <div style="font-size: 13px; font-weight: bold; font-family: monospace; color: #555;">${order.numeroPedido}</div>
            <div style="font-size: 11px; color: #777; margin-top: 5px;">Fecha: ${order.fecha}</div>
            <div style="font-size: 11px; color: #111; font-weight: bold; margin-top: 5px; font-family: monospace; background: #f1f5f9; padding: 4px 8px; border: 1.5px dashed #cbd5e1; border-radius: 6px; display: inline-block;">
              FACTURACIÓN: ${printFacturacion}
            </div>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-box" style="flex: 1.6;">
            <div class="meta-title">Datos del Cliente</div>
            <div style="font-weight: bold; font-size: 14px;">${order.clienteNombre}</div>
            <div style="font-size: 12px; color: #333; margin-top: 5px;">Teléfono: ${order.clienteTelefono}</div>
            <div style="font-size: 12px; color: #333; margin-top: 2px;">Dirección: ${clientAddress}${clientCity ? `, ${clientCity}` : ''}</div>
          </div>
          <div class="meta-box" style="flex: 1;">
            <div class="meta-title">Información Comercial</div>
            <div style="font-size: 13px;">Vendedor: <strong>${order.vendedorNombre}</strong></div>
            <div style="font-size: 13px; margin-top: 2px;">Inicio desp.: <strong>${order.fechaEntregaEstimada}</strong></div>
            <div style="font-size: 13px; margin-top: 2px;">Fin desp.: <strong>${order.fechaLimiteDespacho || 'No asignada'}</strong></div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="text-align: left;">Prendas pedidas</th>
              <th>Talla</th>
              <th>Novedad / Requerimiento</th>
              <th>Cant.</th>
              <th style="text-align: right;">Precio Unitario</th>
              <th style="text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="total-section">
          <div class="total-row">
            <span>Total de referencias:</span>
            <span style="font-weight: bold; font-family: monospace;">${totalReferencias}</span>
          </div>
          <div class="total-row">
            <span>Total de unidades:</span>
            <span style="font-weight: bold; font-family: monospace;">${totalUnidades}</span>
          </div>
          ${order.porcentajeDescuento > 0 ? `
            <div class="total-row" style="color: #c0392b;">
              <span>Descuento (${order.porcentajeDescuento}%):</span>
              <span style="font-family: monospace;">-${formatCOP(order.montoDescuento)}</span>
            </div>
          ` : ''}
          <div class="total-row grand-total">
            <span>Total valor:</span>
            <span style="font-family: monospace; font-weight: bold;">${formatCOP(order.total)}</span>
          </div>
        </div>

        <div style="clear: both;"></div>

        ${order.notas ? `
          <div style="margin-top: 30px; border-left: 3px solid #777; padding-left: 10px; font-style: italic; font-size: 12px; color: #555;">
            <strong>Notas / Instrucciones de Confección:</strong><br/>
            ${order.notas}
          </div>
        ` : ''}

        <div class="footer">
          <p>Este comprobante de pedido fue emitido por el sistema móvil de vendedores de Arare S.A.S.</p>
          <p>Arare S.A.S. - Sistema de toma de pedidos.</p>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.print();
};
