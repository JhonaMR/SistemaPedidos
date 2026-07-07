import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

// Make sure output directory exists
const outputDir = path.join(process.cwd(), 'public', 'plantillas');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function createTemplate(filename, headers, rows) {
  const wb = XLSX.utils.book_new();
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
  const filePath = path.join(outputDir, filename);
  XLSX.writeFile(wb, filePath);
  console.log(`Generated ${filePath}`);
}

// 1. References template
const refHeaders = ['Referencia', 'Precio', 'Nombre/Descripción', 'Etiqueta', 'Segunda Etiqueta'];
const refRows = [
  ['CAM-001', 45000, 'Camisa Formal Oxford Manga Larga', 'Colegial', ''],
  ['POL-002', 35000, 'Camiseta Polo Pima Premium', 'Niño', ''],
  ['VES-005', 65000, 'Vestido Casual Lino Primavera', 'Dama', ''],
  ['PAN-008', 55000, 'Pantalón Jean Clásico', 'Dama', 'Niña']
];
createTemplate('plantilla_referencias.xlsx', refHeaders, refRows);

// 2. Clients template
const clientHeaders = ['ID', 'Nombre', 'NIT', 'Dirección', 'Ciudad', 'Fecha límite de facturación', 'Nota adicional'];
const clientRows = [
  ['001', 'María Camila Pérez', '10203040', 'Calle 45 # 12-34', 'Medellín', '15', 'Entregar sólo por la tarde'],
  ['002', 'Almacén Colegios del Sur', '50607080', 'Carrera 80 # 23-45', 'Cali', '', 'Facturar con resolución RM'],
  ['003', 'Distribuidora Textil SAS', '90102030', 'Calle 10 # 50-60', 'Medellín', '30', '']
];
createTemplate('plantilla_clientes.xlsx', clientHeaders, clientRows);

// 3. Campaign mapping template
const campaignHeaders = ['Referencia'];
const campaignRows = [
  ['CAM-001'],
  ['POL-002'],
  ['VES-005']
];
createTemplate('plantilla_campana_mapeo.xlsx', campaignHeaders, campaignRows);

console.log('All Excel templates generated successfully!');
