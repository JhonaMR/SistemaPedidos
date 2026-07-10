import { FileSpreadsheet, Download } from 'lucide-react';

interface ExcelTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExcelTemplatesModal({ isOpen, onClose }: ExcelTemplatesModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4 animate-in fade-in zoom-in duration-150 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 leading-snug flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              <span>Plantillas de Excel para Carga</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Descarga ejemplos oficiales de archivos para importar al taller.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2.5">
          <a
            href="/plantillas/plantilla_referencias.xlsx"
            download="plantilla_referencias.xlsx"
            className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 rounded-xl transition-all group text-left cursor-pointer"
          >
            <div className="text-xs">
              <span className="font-bold text-slate-800 block group-hover:text-indigo-700 transition-colors">
                Plantilla de Referencias
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Para importar catálogo general de prendas.
              </span>
            </div>
            <Download className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </a>

          <a
            href="/plantillas/plantilla_clientes.xlsx"
            download="plantilla_clientes.xlsx"
            className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 rounded-xl transition-all group text-left cursor-pointer"
          >
            <div className="text-xs">
              <span className="font-bold text-slate-800 block group-hover:text-indigo-700 transition-colors">
                Plantilla de Clientes
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Para cargar datos básicos de clientes y plazos.
              </span>
            </div>
            <Download className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </a>

          <a
            href="/plantillas/plantilla_campana_mapeo.xlsx"
            download="plantilla_campana_mapeo.xlsx"
            className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 rounded-xl transition-all group text-left cursor-pointer"
          >
            <div className="text-xs">
              <span className="font-bold text-slate-800 block group-hover:text-indigo-700 transition-colors">
                Plantilla de Mapeo de Campaña
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Para asociar referencias existentes a una campaña.
              </span>
            </div>
            <Download className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </a>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors text-center cursor-pointer"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
