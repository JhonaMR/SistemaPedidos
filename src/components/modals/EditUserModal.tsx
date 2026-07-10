import React, { useState, useEffect } from 'react';
import { UserCog } from 'lucide-react';
import { UsuarioApp } from '../../types';

interface EditUserModalProps {
  isOpen: boolean;
  usuarios: UsuarioApp[];
  currentUser: UsuarioApp | null;
  onUpdateUsuarios: (updatedList: UsuarioApp[]) => void;
  onClose: () => void;
}

export default function EditUserModal({
  isOpen,
  usuarios,
  currentUser,
  onUpdateUsuarios,
  onClose
}: EditUserModalProps) {
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<UsuarioApp | null>(null);
  const [editUserRol, setEditUserRol] = useState<'general' | 'soporte'>('general');
  const [editUserResetStatus, setEditUserResetStatus] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedUserToEdit(null);
      setEditUserRol('general');
      setEditUserResetStatus(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserToEdit) {
      alert('Por favor selecciona un usuario.');
      return;
    }

    const updatedList = usuarios.map(u => {
      if (u.id === selectedUserToEdit.id) {
        const updated = {
          ...u,
          rol: editUserRol,
        };
        if (editUserResetStatus) {
          updated.esPrimeraVez = true;
          updated.clave = '1234';
        }
        return updated;
      }
      return u;
    });

    onUpdateUsuarios(updatedList);
    alert(`Usuario ${selectedUserToEdit.usuario} modificado con éxito.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-6 relative overflow-hidden text-left">
        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600" />

        <div className="space-y-1">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <UserCog className="h-5 w-5 text-indigo-600" />
            <span>Modificar Usuario</span>
          </h3>
          <p className="text-xs text-slate-500">
            Selecciona un usuario para cambiar su rol o restablecer su estado a Pendiente de Primer Ingreso.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Seleccionar Usuario</label>
            <select
              value={selectedUserToEdit?.id || ''}
              onChange={(e) => {
                const val = e.target.value;
                const found = usuarios.find(u => u.id === val);
                setSelectedUserToEdit(found || null);
                if (found) {
                  setEditUserRol(found.rol);
                }
              }}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              required
            >
              <option value="" disabled>-- Selecciona un usuario --</option>
              {usuarios.filter(u => u.id !== currentUser?.id).map(u => (
                <option key={u.id} value={u.id}>
                  {u.nombre} ({u.usuario}) - Rol: {u.rol}
                </option>
              ))}
            </select>
          </div>

          {selectedUserToEdit && (
            <>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Rol</label>
                <select
                  value={editUserRol}
                  onChange={(e) => setEditUserRol(e.target.value as 'general' | 'soporte')}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="general">General (Vendedor)</option>
                  <option value="soporte">Soporte (Administrador)</option>
                </select>
              </div>

              <div className="flex items-start gap-2 bg-amber-50/50 border border-amber-100 rounded-lg p-3 text-xs">
                <input
                  type="checkbox"
                  id="reset-status-checkbox"
                  checked={editUserResetStatus}
                  onChange={(e) => setEditUserResetStatus(e.target.checked)}
                  className="mt-0.5"
                />
                <label htmlFor="reset-status-checkbox" className="text-slate-700 leading-normal cursor-pointer select-none">
                  <span className="font-bold text-slate-800">Devolver a Pendiente Primer Ingreso</span>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Si se activa, el usuario volverá a tener la clave inicial <strong>1234</strong> y se le obligará a cambiar su clave al ingresar la próxima vez.
                  </p>
                </label>
              </div>
            </>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase rounded-lg transition-colors border border-slate-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!selectedUserToEdit}
              className={`w-1/2 py-2.5 text-white text-xs font-bold uppercase rounded-lg shadow-sm transition-colors ${
                selectedUserToEdit
                  ? 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'
                  : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
