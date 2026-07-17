import { useState } from 'react';
import { Package } from 'lucide-react';
import { Prenda, UsuarioApp } from '../../types';

interface CampanaRefsConfigModalProps {
  isOpen: boolean;
  campanaNombre: string;
  campanasReferencias: Record<string, string[]>;
  catalogGarments: Prenda[];
  currentUser: UsuarioApp | null;
  onUpdateReferencias: (updated: Record<string, string[]>) => void;
  onClose: () => void;
}

export default function CampanaRefsConfigModal({
  isOpen,
  campanaNombre,
  campanasReferencias,
  catalogGarments,
  currentUser,
  onUpdateReferencias,
  onClose
}: CampanaRefsConfigModalProps) {
  const [campanaRefSearch, setCampanaRefSearch] = useState('');

  if (!isOpen) return null;

  const isSoporte = currentUser?.rol === 'soporte';

  const handleToggle = (prendaRef: string, isEnabled: boolean) => {
    if (!isSoporte) return;
    const updated = { ...campanasReferencias };
    const currentRefs = updated[campanaNombre] || [];
    if (isEnabled) {
      updated[campanaNombre] = currentRefs.filter(ref => ref !== prendaRef);
    } else {
      updated[campanaNombre] = [...currentRefs, prendaRef];
    }
    onUpdateReferencias(updated);
  };

  const handleEnableAll = () => {
    const updated = { ...campanasReferencias };
    updated[campanaNombre] = catalogGarments.map(p => p.ref);
    onUpdateReferencias(updated);
  };

  const handleDisableAll = () => {
    const updated = { ...campanasReferencias };
    updated[campanaNombre] = [];
    onUpdateReferencias(updated);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4 relative flex flex-col max-h-[90vh] text-left">
        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600" />

        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Package className="h-5 w-5 text-indigo-600" />
              <span>Referencias - {campanaNombre}</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Selecciona qué prendas están cargadas como activas para la toma de pedidos en esta campaña.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* Quick action buttons & search */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-center shrink-0">
          <input
            type="text"
            placeholder="Buscar por referencia o nombre..."
            value={campanaRefSearch}
            onChange={(e) => setCampanaRefSearch(e.target.value)}
            className="w-full sm:flex-1 p-2 bg-[#FAFBFD] border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          />
          {isSoporte && (
            <div className="flex gap-2 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={handleEnableAll}
                className="flex-1 sm:flex-initial px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-extrabold uppercase rounded-lg text-center cursor-pointer"
              >
                Habilitar Todas
              </button>
              <button
                type="button"
                onClick={handleDisableAll}
                className="flex-1 sm:flex-initial px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-extrabold uppercase rounded-lg text-center cursor-pointer"
              >
                Deshabilitar Todas
              </button>
            </div>
          )}
        </div>

        {/* References Table Scroll Container */}
        <div className="overflow-y-auto overflow-x-auto flex-1 border border-slate-100 rounded-xl divide-y divide-slate-50 w-full">
          <table className="w-full text-left border-collapse text-xs min-w-[500px]">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[9px] uppercase tracking-wider text-slate-400 font-extrabold sticky top-0">
                <th className="p-3">Referencia y Nombre</th>
                <th className="p-3 text-right">Precio de lista</th>
                <th className="p-3 text-center w-28">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {catalogGarments
                .filter(p => {
                  const query = campanaRefSearch.trim().toLowerCase();
                  if (!query) return true;
                  return p.ref.toLowerCase().includes(query) || p.nombre.toLowerCase().includes(query);
                })
                .map((prenda) => {
                  const isEnabled = (campanasReferencias[campanaNombre] || []).includes(prenda.ref);
                  return (
                    <tr key={prenda.ref} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-semibold text-slate-800">
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-600 mr-2">
                          {prenda.ref}
                        </span>
                        <span>{prenda.nombre}</span>
                        <span className="block text-[9px] text-slate-400 font-normal mt-0.5">
                          {Array.isArray(prenda.categoria) ? prenda.categoria.join(' / ') : prenda.categoria}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-indigo-600">
                        {new Intl.NumberFormat('es-CO', {
                          style: 'currency',
                          currency: 'COP',
                          minimumFractionDigits: 0
                        }).format(prenda.precioBase)}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggle(prenda.ref, isEnabled)}
                          disabled={!isSoporte}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all border ${
                            !isSoporte
                              ? isEnabled
                                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-600 cursor-not-allowed'
                                : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                              : isEnabled
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 cursor-pointer'
                              : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 cursor-pointer'
                          }`}
                        >
                          {isEnabled ? 'Habilitada' : 'Desactivada'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm transition-all cursor-pointer"
          >
            Aceptar y Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
