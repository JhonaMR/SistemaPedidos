import React from 'react';
import { X, ImageIcon } from 'lucide-react';
import { Prenda } from '../types';

interface ViewFotoModalProps {
  prenda: Prenda;
  onClose: () => void;
}

export function ViewFotoModal({ prenda, onClose }: ViewFotoModalProps) {
  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(val);
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl relative overflow-hidden space-y-4 animate-in fade-in zoom-in duration-200 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="text-[9px] font-mono font-black text-indigo-600 tracking-wider uppercase block">Ficha de Referencia</span>
            <h4 className="text-base font-extrabold text-slate-900 leading-snug">{prenda.nombre}</h4>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Referencia: {prenda.ref} • {Array.isArray(prenda.categoria) ? prenda.categoria.join(', ') : prenda.categoria}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Photo Preview Panel */}
        <div className="h-[250px] sm:h-[380px] w-full rounded-xl bg-slate-50 border border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 text-slate-400 relative overflow-hidden shrink-0">
          {prenda.imagenUrl ? (
            <img 
              src={prenda.imagenUrl} 
              alt={prenda.nombre} 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/20 via-transparent to-transparent" />
              <ImageIcon className="h-10 w-10 text-slate-300 group-hover:scale-105 transition-transform" />
              <span className="text-sm font-black uppercase tracking-widest text-slate-400 font-mono">[ FOTO PRENDA ]</span>
              <p className="text-[10px] text-slate-400 text-center max-w-xs px-4">
                Vista previa ilustrativa de {prenda.nombre}. Todas las costuras y acabados son garantizados.
              </p>
            </>
          )}
        </div>

        {/* Specifications row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 rounded-xl p-3 text-xs border border-slate-100">
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Precio de lista</span>
            <span className="font-extrabold text-indigo-600 font-mono text-sm">{formatCOP(prenda.precioBase)}</span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Tallas</span>
            <span className="font-bold text-slate-700 break-words block">{prenda.tallasDisponibles.join(', ')}</span>
          </div>
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-[#1E293B] hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-colors text-center"
        >
          Cerrar Vista
        </button>
      </div>
    </div>
  );
}
