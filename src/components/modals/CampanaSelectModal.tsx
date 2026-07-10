import { Package } from 'lucide-react';
import { Campana } from '../../types';

interface CampanaSelectModalProps {
  isOpen: boolean;
  campanasDisponibles: Campana[];
  activeCampana: string;
  onSelectCampana: (campanaName: string) => void;
  onConfirm: () => void;
}

export default function CampanaSelectModal({
  isOpen,
  campanasDisponibles,
  activeCampana,
  onSelectCampana,
  onConfirm
}: CampanaSelectModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-6 relative overflow-hidden text-left">
        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600" />

        <div className="space-y-1">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Package className="h-5 w-5 text-indigo-600" />
            <span>Seleccionar Campaña Activa</span>
          </h3>
          <p className="text-xs text-slate-500">
            Selecciona la campaña comercial en la que registrarás los próximos pedidos de prendas de vestir.
          </p>
        </div>

        <div className="space-y-2">
          {[...campanasDisponibles].sort((a, b) => a.numero - b.numero).map((campana) => {
            const fullName = `${campana.nombre} ${campana.anio}`;
            const isSelected = activeCampana === fullName;
            return (
              <button
                key={fullName}
                type="button"
                onClick={() => onSelectCampana(fullName)}
                className={`w-full p-3.5 text-left rounded-xl text-xs font-bold transition-all border flex items-center justify-between ${
                  isSelected
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-1 ring-indigo-500'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{fullName}</span>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onConfirm}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm transition-all text-center"
        >
          Confirmar Campaña y Entrar
        </button>
      </div>
    </div>
  );
}
