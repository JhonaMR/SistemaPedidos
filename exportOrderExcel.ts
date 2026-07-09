import ExcelJS from 'exceljs';
import { Order, Client, Seller, Reference } from '../types';

export const exportOrderToExcel = async (
    order: Order,
    client: Client | undefined,
    seller: Seller | undefined,
    referencesContext: Reference[],
    isMelas: boolean
) => {
    try {
        const formatName = isMelas ? 'FormatoPedidosMelas.xlsx' : 'FormatoPedidosPlow.xlsx';

        // Fetch base excel file from public format
        const response = await fetch(`/formats/${formatName}`);
        if (!response.ok) throw new Error('No se pudo encontrar el formato de excel');

        const arrayBuffer = await response.arrayBuffer();

        // Load to ExcelJS
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);

        // Obtener la hoja principal
        const worksheet = workbook.worksheets[0];

        // CABECERA
        worksheet.getCell('M4').value = order.orderNumber != null ? order.orderNumber : ''; // número del pedido
        worksheet.getCell('M7').value = (seller?.name || '').split(' ')[0].toUpperCase();
        worksheet.getCell('N9').value = client?.id || ''; // codigo cliente
        worksheet.getCell('C9').value = client?.name || ''; // nombre cliente
        worksheet.getCell('C11').value = client?.address || ''; // direccion 
        worksheet.getCell('K11').value = client?.nit || ''; // NIT
        worksheet.getCell('K13').value = client?.city || ''; // ciudad

        const formatDate = (dateStr?: string | null) => {
            if (!dateStr) return " - ";
            // Convertir fechas a DD/MM/AAAA
            const [year, month, day] = dateStr.split('T')[0].split('-');
            if (year && month && day) return `${day}/${month}/${year}`;

            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return " - ";
            return d.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
        };

        worksheet.getCell('N13').value = formatDate(order.createdAt);
        worksheet.getCell('N15').value = formatDate(order.startDate);
        worksheet.getCell('N16').value = formatDate(order.endDate);
        
        // PORCENTAJES
        console.log("Exportando porcentajes:", { oficial: order.porcentajeOficial, remision: order.porcentajeRemision });
        worksheet.getCell('J4').value = Number(order.porcentajeOficial) || 0;
        worksheet.getCell('K4').value = Number(order.porcentajeRemision) || 0;

        // REFERENCIAS
        const ITEMS_START_ROW = 20;
        const TOTAL_FORMAT_ROWS = 18;
        const FORMAT_FOOTER_ROWS = 2; // 1 fila subtotal + 1 fila totales al pie
        const items = order.items || [];

        // Número real de filas del formato original (para saber cuánto limpiar al final)
        const originalTotalRows = worksheet.rowCount;

        if (items.length > TOTAL_FORMAT_ROWS) {
            // Insertar filas extra copiando estilo de la última fila de items
            const extraRows = items.length - TOTAL_FORMAT_ROWS;
            worksheet.spliceRows(ITEMS_START_ROW + TOTAL_FORMAT_ROWS, 0, ...Array(extraRows).fill([]));
            const templateRow = worksheet.getRow(ITEMS_START_ROW + TOTAL_FORMAT_ROWS - 1);
            for (let i = 0; i < extraRows; i++) {
                const newRow = worksheet.getRow(ITEMS_START_ROW + TOTAL_FORMAT_ROWS + i);
                newRow.height = templateRow.height;
                templateRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    const newCell = newRow.getCell(colNumber);
                    newCell.style = Object.assign({}, cell.style);
                });
            }
        } else if (items.length < TOTAL_FORMAT_ROWS) {
            // Eliminar filas sobrantes del rango de items
            const rowsToRemove = TOTAL_FORMAT_ROWS - items.length;
            worksheet.spliceRows(ITEMS_START_ROW + items.length, rowsToRemove);
        }

        // Rellenamos
        items.forEach((item: any, index: number) => {
            const rowNum = ITEMS_START_ROW + index;
            const refDetail = referencesContext.find(r => r.id === item.reference);

            const row = worksheet.getRow(rowNum);

            // Referencia como número si es posible
            const refAsNumber = Number(item.reference);
            row.getCell('B').value = isNaN(refAsNumber) ? item.reference : refAsNumber;
            row.getCell('C').value = refDetail?.description || '';
            const quantity = Number(item.quantity) || 0;
            const salePrice = Number(item.salePrice !== undefined ? item.salePrice : refDetail?.price || 0);

            // Tallas (D=S, E=M, F=L, G=XL) si existen
            if (item.sizes) {
                row.getCell('D').value = item.sizes.S || 0;
                row.getCell('E').value = item.sizes.M || 0;
                row.getCell('F').value = item.sizes.L || 0;
                row.getCell('G').value = item.sizes.XL || 0;
            }

            // Novedad (col J)
            if (item.novedad) row.getCell('J').value = item.novedad;

            row.getCell('L').value = quantity;

            const priceCell = row.getCell('M');
            priceCell.value = salePrice;
            priceCell.numFmt = '"$"#,##0'; // Contabilidad sin decimales

            // Asegurarnos de que N tenga la fórmula del subtotal (Cantidad * Precio) si fue clonada o es nueva
            const subtotalCell = row.getCell('N');
            subtotalCell.value = { formula: `L${rowNum}*M${rowNum}`, result: quantity * salePrice };
            subtotalCell.numFmt = '"$"#,##0';

            row.commit();
        });

        // FILA DE TOTALES
        // Después del spliceRows, las filas de footer quedaron en:
        // penúltima: ITEMS_START_ROW + items.length  ← fila combinada (observaciones)
        // última (totales): ITEMS_START_ROW + items.length + 1
        const lastRecRow = ITEMS_START_ROW + items.length - 1;
        const obsBaseRow = ITEMS_START_ROW + items.length;
        const observaciones: string[] = (order as any).observaciones || [];
        const extraObsRows = Math.max(0, observaciones.length - 1);

        // Si hay más de una observación, duplicar la fila combinada
        if (extraObsRows > 0) {
            worksheet.spliceRows(obsBaseRow + 1, 0, ...Array(extraObsRows).fill([]));
            const templateRow = worksheet.getRow(obsBaseRow);
            for (let i = 0; i < extraObsRows; i++) {
                const newRow = worksheet.getRow(obsBaseRow + 1 + i);
                newRow.height = templateRow.height;
                templateRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    const newCell = newRow.getCell(colNumber);
                    newCell.style = Object.assign({}, cell.style);
                });
                try { worksheet.unMergeCells(`C${obsBaseRow + 1 + i}:L${obsBaseRow + 1 + i}`); } catch (e) { /* ignorar */ }
                worksheet.mergeCells(`C${obsBaseRow + 1 + i}:L${obsBaseRow + 1 + i}`);
                newRow.commit();
            }
        }

        // Escribir observaciones en las filas combinadas (celda C, que es el inicio del merge C:L)
        observaciones.forEach((obs, i) => {
            const obsRow = worksheet.getRow(obsBaseRow + i);
            // Desmerger y remerger para asegurar que la celda combinada esté limpia
            try { worksheet.unMergeCells(`C${obsBaseRow + i}:L${obsBaseRow + i}`); } catch (e) { /* ignorar */ }
            worksheet.mergeCells(`C${obsBaseRow + i}:L${obsBaseRow + i}`);
            const cell = obsRow.getCell('C');
            cell.value = obs;
            obsRow.commit();
        });

        const finalTotalsRowNum = obsBaseRow + Math.max(observaciones.length, 1);
        const finalTotalsRow = worksheet.getRow(finalTotalsRowNum);

        finalTotalsRow.getCell('L').value = { formula: `SUM(L${ITEMS_START_ROW}:L${lastRecRow})` };
        const totalValueCell = finalTotalsRow.getCell('N');
        totalValueCell.value = { formula: `SUM(N${ITEMS_START_ROW}:N${lastRecRow})` };
        totalValueCell.numFmt = '"$"#,##0';

        try { worksheet.unMergeCells(`B${finalTotalsRowNum}:K${finalTotalsRowNum}`); } catch (e) { /* ignorar */ }
        worksheet.mergeCells(`B${finalTotalsRowNum}:K${finalTotalsRowNum}`);
        finalTotalsRow.commit();

        // Limpiar todas las filas después de la fila de totales
        // spliceRows no es confiable en ExcelJS para esto — limpiamos celda por celda
        for (let r = finalTotalsRowNum + 1; r <= 200; r++) {
            const row = worksheet.getRow(r);
            let hasContent = false;
            row.eachCell({ includeEmpty: false }, () => { hasContent = true; });
            if (!hasContent) {
                // Verificar si tiene altura o estilo definido
                if (!row.height && !row.hasValues) continue;
            }
            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.value = null;
                cell.style = {};
            });
            row.height = undefined as any;
        }

        // Exportar blob
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        // Generar URL y forzar descarga
        const orderRef = order.orderNumber || order.id.slice(0, 6);
        const fileName = `${client?.name || 'Cliente'}.xlsx`;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error("Error exportando pedido Excel:", error);
        alert("Hubo un error al generar el pedido Excel. Por favor intenta de nuevo.");
    }
};
