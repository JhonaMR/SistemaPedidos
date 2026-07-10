import React, { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import { Campana } from '../../types';

interface NewCampanaModalProps {
  isOpen: boolean;
  campanasDisponibles: Campana[];
  onCreateCampana: (nombre: string, anio: number, numero: number) => void;
  onClose: () => void;
}

export default function NewCampanaModal({
  isOpen,
  campanasDisponibles,
  onCreateCampana,
  onClose
}: NewCampanaModalProps) {
  const [newCampanaName, setNewCampanaName] = useState('');
  const [newCampanaYear, setNewCampanaYear] = useState('');
  const [newCampanaNumber, setNewCampanaNumber] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNewCampanaName('');
      setNewCampanaYear(String(new Date().getFullYear()));
      const maxNum = campanasDisponibles.reduce((max, c) => Math.max(max, c.numero || 0), 0);
      setNewCampanaNumber(String(maxNum + 1));
    }
  }, [isOpen, campanasDisponibles]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampanaName.trim() || !newCampanaYear.trim() || !newCampanaNumber.trim()) {
      alert("Por favor rellene todos los campos.");
      return;
    }

    const cleanName = newCampanaName.trim();
    const yearVal = parseInt(newCampanaYear, 10);
    const numVal = parseInt(newCampanaNumber, 10);

    if (isNaN(yearVal) || isNaN(numVal)) {
      alert("Año y Número de orden deben ser valores numéricos.");
      return;
    }

    onCreateCampana(cleanName, yearVal, numVal);
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4 animate-in fade-in zoom-in duration-150 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 leading-snug flex items-center gap-2">
              <Package className="h-5 w-5 text-indigo-600" />
              <span>Crear Nueva Campaña</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Registre una nueva campaña comercial.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Nombre de la Campaña *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Vacaciones, Madres, Inicio de año"
              value={newCampanaName}
              onChange={(e) => setNewCampanaName(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Año *
              </label>
              <input
                type="number"
                required
                min={2026}
                max={2035}
                placeholder="Ej. 2026"
                value={newCampanaYear}
                onChange={(e) => {
                  const yr = e.target.value;
                  setNewCampanaYear(yr);
                  if (yr.trim() !== '') {
                    const maxNum = campanasDisponibles.reduce((max, c) => Math.max(max, c.numero || 0), 0);
                    setNewCampanaNumber(String(maxNum + 1));
                  }
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Número de Orden *
              </label>
              <input
                type="number"
                required
                min={1}
                placeholder="Ej. 5"
                value={newCampanaNumber}
                onChange={(e) => setNewCampanaNumber(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors text-center cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-colors text-center cursor-pointer"
          >
            Crear Campaña
          </button>
        </div>
      </form>
    </div>
  );
}
