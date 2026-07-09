import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Order, Client, Seller, Reference } from '../types';

const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    const [year, month, day] = dateStr.split('T')[0].split('-');
    if (year && month && day) return `${day}/${month}/${year}`;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const fmtNum = (n: number) => `$${n.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;

export const exportOrderToPdf = async (
    order: Order & { items: any[] },
    client: Client | undefined,
    seller: Seller | undefined,
    referencesContext: Reference[],
    isMelas: boolean
) => {
    const brandColor = isMelas ? '#fce7f3' : '#f2bfbe';
    const brandTextColor = isMelas ? '#9d174d' : '#6b2a35';
    const brandName = isMelas ? 'MELAS' : 'PLOW';
    const logoSrc = isMelas ? '/logos/melas-192x192.png' : '/logos/plow-192x192.png';
    const sellerFull = (seller?.name || '').toUpperCase();
    const hasSizes = order.items.some((i: any) => i.sizes);

    const brandInfo = isMelas ? [
        'CLAMELAS S.A.S', 'NIT: 901980480', '3146317522', 'Itagüí (Ant)', 'Dirección: CR 52 d # 76 67',
    ] : [
        'ARARE S.A.S.', 'NIT: 901453438', '3146320002', 'Itagüí (Ant)', 'Dirección: CLL 77 a # 45 a 30 - 301',
    ];

    const totalUnits = order.items.reduce((a: number, i: any) => a + (Number(i.quantity) || 0), 0);
    const totalValue = order.items.reduce((a: number, i: any) => a + (Number(i.quantity) || 0) * (Number(i.salePrice) || 0), 0);

    const itemRows = order.items.map((item: any) => {
        const ref = referencesContext.find(r => r.id === item.reference);
        const qty = Number(item.quantity) || 0;
        const price = Number(item.salePrice) || 0;
        return { ...item, description: ref?.description || item.description || '', qty, price, subtotal: qty * price };
    });

    // ── 1. Renderizar header + info con html2canvas ──
    const headerHtml = `
<div id="pdf-header" style="font-family:Arial,sans-serif;font-size:11px;color:#1e293b;width:900px;background:#fff">
    <div style="background:${brandColor};padding:16px 24px;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:12px">
            <img src="${logoSrc}" style="width:48px;height:48px;border-radius:8px;background:#fff;padding:4px" crossorigin="anonymous"/>
            <div>
                <div style="color:${brandTextColor};font-size:18px;font-weight:900;letter-spacing:1px;line-height:1.3">${brandInfo[0]}</div>
                <div style="color:${brandTextColor};opacity:0.85;font-size:12px;line-height:1.4">${brandInfo[1]}</div>
            </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-start;gap:1px;margin-left:20px;margin-right:auto">
            ${brandInfo.slice(2).map(l => `<div style="color:${brandTextColor};opacity:0.85;font-size:12px;line-height:1.4">${l}</div>`).join('')}
        </div>
        <div style="text-align:right;color:${brandTextColor}">
            <div style="font-size:10px;opacity:0.8">N° Pedido</div>
            <div style="font-size:22px;font-weight:900">${order.orderNumber ?? '—'}</div>
        </div>
    </div>
    <div style="display:flex;border-bottom:2px solid #e2e8f0">
        <div style="flex:3;padding:5px 24px;border-right:1px solid #e2e8f0">
            <div style="font-size:9px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">Datos del Cliente</div>
            <table style="width:100%;border-collapse:collapse;font-size:12px">
                <tr><td style="color:#64748b;width:110px;padding:2px 0">NOMBRE</td><td style="font-weight:700">${client?.name || '—'}</td></tr>
                <tr><td style="color:#64748b;padding:2px 0">NIT</td><td>${(client as any)?.nit || '—'}</td></tr>
                <tr><td style="color:#64748b;padding:2px 0">DIRECCIÓN</td><td>${client?.address || '—'}</td></tr>
                <tr><td style="color:#64748b;padding:2px 0">CIUDAD</td><td>${client?.city || '—'}</td></tr>
                <tr><td style="color:#64748b;padding:2px 0">ID</td><td>${client?.id || '—'}</td></tr>
            </table>
        </div>
        <div style="flex:2;padding:5px 24px">
            <div style="font-size:9px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Datos del Pedido</div>
            <table style="width:100%;border-collapse:collapse;font-size:12px">
                <tr><td style="color:#64748b;width:130px;padding:3px 0">VENDEDOR</td><td style="font-weight:700">${sellerFull}</td></tr>
                <tr><td style="color:#64748b;padding:3px 0">FECHA PEDIDO</td><td>${formatDate(order.createdAt)}</td></tr>
                <tr><td style="color:#64748b;padding:3px 0">% Fact.</td><td>${order.porcentajeOficial ?? '—'} / ${order.porcentajeRemision ?? '—'}</td></tr>
            </table>
            <div style="margin-top:5px;background:${isMelas ? '#fee2e2' : '#f9d8d8'};border-radius:6px;padding:8px;min-width:100%;box-sizing:border-box;display:flex;align-items:center;justify-content:center">
                <div style="display:flex;justify-content:space-between;align-items:center;width:100%">
                    <div style="text-align:center">
                        <div style="color:${isMelas ? '#991b1b' : '#7c2230'};font-size:8px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">Inicio despacho</div>
                        <div style="color:${isMelas ? '#7f1d1d' : '#5c1a24'};font-weight:700;font-size:11px">${formatDate(order.startDate)}</div>
                    </div>
                    <div style="color:${isMelas ? '#f87171' : '#c45a6a'};font-size:14px;padding:0 8px">→</div>
                    <div style="text-align:center">
                        <div style="color:${isMelas ? '#991b1b' : '#7c2230'};font-size:8px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">Fin despacho</div>
                        <div style="color:${isMelas ? '#7f1d1d' : '#5c1a24'};font-weight:700;font-size:11px">${formatDate(order.endDate)}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>`;

    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:0;left:0;z-index:-1;opacity:0;pointer-events:none';
    container.innerHTML = headerHtml;
    document.body.appendChild(container);

    const headerEl = container.querySelector('#pdf-header') as HTMLElement;
    const headerCanvas = await html2canvas(headerEl, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    document.body.removeChild(container);

    // ── 2. Construir PDF con jsPDF ──
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const PW = 215.9; // ancho carta portrait
    const PH = 279.4;
    const margin = 0;

    // Pegar header capturado
    const headerImgData = headerCanvas.toDataURL('image/png');
    const headerRatio = headerCanvas.width / headerCanvas.height;
    const headerW = PW;
    const headerH = headerW / headerRatio;
    pdf.addImage(headerImgData, 'PNG', margin, 0, headerW, headerH);

    let curY = headerH + 2;

    // ── 3. Tabla con jsPDF directo ──
    const ROW_H = 7; // mm por fila
    const HEADER_H = 7;
    const FS = 8; // font size pts

    // Definir columnas (x, width en mm, align)
    type Col = { label: string; subLabel?: string; x: number; w: number; align: 'left' | 'center' | 'right'; headerAlign?: 'left' | 'center' | 'right' };
    const cols: Col[] = hasSizes ? [
        { label: 'Referencia',  x: 0,   w: 22,  align: 'center' },
        { label: 'Descripción', x: 22,  w: 60,  align: 'left'   },
        { label: 'S',  subLabel: '2-4',   x: 82,  w: 10,  align: 'center' },
        { label: 'M',  subLabel: '6-8',   x: 92,  w: 10,  align: 'center' },
        { label: 'L',  subLabel: '10-12', x: 102, w: 10,  align: 'center' },
        { label: 'XL', subLabel: '14-16', x: 112, w: 10,  align: 'center' },
        { label: 'Novedad',     x: 122, w: 24,  align: 'left'   },
        { label: 'Cant.',       x: 146, w: 10,  align: 'center', headerAlign: 'center'  },
        { label: 'Precio V.',   x: 156, w: 25,  align: 'center' },
        { label: 'Subtotal',    x: 181, w: 29,  align: 'right'  },
    ] : [
        { label: 'Referencia',  x: 0,   w: 22,  align: 'center' },
        { label: 'Descripción', x: 22,  w: 82,  align: 'left'   },
        { label: 'Cant.',       x: 104, w: 10,  align: 'center', headerAlign: 'center'  },
        { label: 'Novedad',     x: 114, w: 32,  align: 'left'   },
        { label: 'Precio V.',   x: 146, w: 28,  align: 'center' },
        { label: 'Subtotal',    x: 174, w: 36,  align: 'right'  },
    ];

    const truncate = (text: string, maxW: number): string => {
        const ellipsis = '...';
        if (pdf.getTextWidth(text) <= maxW) return text;
        let t = text;
        while (t.length > 0 && pdf.getTextWidth(t + ellipsis) > maxW) {
            t = t.slice(0, -1);
        }
        return t + ellipsis;
    };

    const drawRow = (y: number, bg: [number,number,number] | null, cells: string[], bold = false) => {
        if (bg) {
            pdf.setFillColor(bg[0], bg[1], bg[2]);
            pdf.rect(margin, y, PW - margin * 2, ROW_H, 'F');
        }
        pdf.setFont('helvetica', bold ? 'bold' : 'normal');
        pdf.setFontSize(FS);
        pdf.setTextColor(30, 41, 59);
        const textY = y + ROW_H / 2 + (FS * 0.3528) / 2;
        const pad = 1.5;
        cols.forEach((col, i) => {
            const raw = cells[i] ?? '';
            const text = truncate(raw, col.w - pad * 2);
            // Subtotal: alinear a la derecha con margen interno
            if (col.align === 'right') {
                pdf.text(text, margin + col.x + col.w - pad * 3, textY, { align: 'right' });
            } else if (col.align === 'center') {
                pdf.text(text, margin + col.x + col.w / 2, textY, { align: 'center' });
            } else {
                pdf.text(text, margin + col.x + pad, textY, { align: 'left' });
            }
        });
        pdf.setDrawColor(226, 232, 240);
        pdf.line(margin, y + ROW_H, PW - margin, y + ROW_H);
        pdf.setDrawColor(226, 232, 240);
        cols.slice(1).forEach(col => {
            pdf.line(margin + col.x, y, margin + col.x, y + ROW_H);
        });
    };

    // Dibuja el header de la tabla (fila de columnas)
    const drawTableHeader = (y: number) => {
        const [hr, hg, hb] = [226, 232, 240];
        pdf.setFillColor(hr, hg, hb);
        pdf.rect(margin, y, PW - margin * 2, HEADER_H, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(FS - 0.5);
        pdf.setTextColor(71, 85, 105);
        const hTextY = y + HEADER_H / 2 + ((FS - 0.5) * 0.3528) / 2;
        cols.forEach(col => {
            const pad = 1.5;
            // Novedad y Subtotal siempre centrados en el header
            const isCenter = col.label === 'Novedad' || col.label === 'Subtotal' || col.label === 'Descripción';
            const ha: 'left' | 'center' | 'right' = isCenter ? 'center' : (col.headerAlign || col.align);
            const cx = margin + col.x + (ha === 'center' ? col.w / 2 : ha === 'right' ? col.w - pad : pad);
            if (col.subLabel) {
                const lineH = (FS - 0.5) * 0.3528;
                const y1 = y + HEADER_H / 2 - lineH * 0.3;
                const y2 = y + HEADER_H / 2 + lineH * 1.1;
                pdf.text(col.label.toUpperCase(), cx, y1, { align: ha });
                pdf.setFontSize(FS - 2);
                pdf.text(col.subLabel, cx, y2, { align: ha });
                pdf.setFontSize(FS - 0.5);
            } else {
                pdf.text(col.label.toUpperCase(), cx, hTextY, { align: ha });
            }
        });
        pdf.setDrawColor(203, 213, 225);
        pdf.line(margin, y + HEADER_H, PW - margin, y + HEADER_H);
        pdf.setDrawColor(203, 213, 225);
        cols.slice(1).forEach(col => {
            pdf.line(margin + col.x, y, margin + col.x, y + HEADER_H);
        });
        return y + HEADER_H;
    };

    let currentPage = 1;
    const checkPage = (y: number): number => {
        if (y + ROW_H > PH - 10) {
            // Número de hoja al pie antes de cambiar
            pdf.setFont('helvetica', 'italic');
            pdf.setFontSize(7);
            pdf.setTextColor(148, 163, 184);
            pdf.text(`Hoja ${currentPage}`, PW / 2, PH - 4, { align: 'center' });

            pdf.addPage();
            currentPage++;

            // Repetir header de marca en la nueva página
            pdf.addImage(headerImgData, 'PNG', margin, 0, headerW, headerH);
            let newY = headerH + 2;
            newY = drawTableHeader(newY);
            return newY;
        }
        return y;
    };

    curY = drawTableHeader(curY);

    // Filas de datos
    itemRows.forEach((item, i) => {
        curY = checkPage(curY);
        const bg: [number,number,number] = i % 2 === 0 ? [255,255,255] : [248,250,252];
        const cells = hasSizes ? [
            item.reference,
            item.description,
            String(item.sizes?.S || ''),
            String(item.sizes?.M || ''),
            String(item.sizes?.L || ''),
            String(item.sizes?.XL || ''),
            (item as any).novedad || '',
            String(item.qty),
            fmtNum(item.price),
            fmtNum(item.subtotal),
        ] : [
            item.reference,
            item.description,
            String(item.qty),
            (item as any).novedad || '',
            fmtNum(item.price),
            fmtNum(item.subtotal),
        ];
        drawRow(curY, bg, cells);
        curY += ROW_H;
    });

    // Fila totales
    curY = checkPage(curY);
    pdf.setFillColor(241, 245, 249);
    pdf.rect(margin, curY, PW - margin * 2, ROW_H, 'F');
    pdf.setDrawColor(203, 213, 225);
    pdf.line(margin, curY, PW - margin, curY);
    const totalCells = hasSizes
        ? [`${itemRows.length} refs`, '', '', '', '', '', '', String(totalUnits), 'TOTAL', fmtNum(totalValue)]
        : [`${itemRows.length} refs`, '', String(totalUnits), '', 'TOTAL', fmtNum(totalValue)];
    drawRow(curY, null, totalCells, true);
    curY += ROW_H;

    // Observaciones
    const obs: string[] = ((order as any).observaciones || []).filter((o: string) => o.trim());
    if (obs.length > 0) {
        curY += 3;
        pdf.setFillColor(255, 245, 245);
        pdf.rect(margin, curY, PW - margin * 2, 6 + obs.length * 5, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(248, 113, 113);
        pdf.text('OBSERVACIONES', margin + 4, curY + 4);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(55, 65, 81);
        obs.forEach((o, i) => {
            pdf.text(`${i + 1}. ${o}`, margin + 4, curY + 9 + i * 5);
        });
        curY += 6 + obs.length * 5;
    }

    // Footer con número de hoja final
    curY += 3;
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(7);
    pdf.setTextColor(148, 163, 184);
    pdf.text(`Hoja ${currentPage}`, PW / 2, PH - 4, { align: 'center' });
    pdf.text(`Generado por: ${(order as any).settledBy || '—'}`, margin + 4, curY);
    pdf.text(new Date().toLocaleString('es-CO'), PW - margin - 4, curY, { align: 'right' });

    pdf.save(`${client?.name || 'cliente'}.pdf`);
};
