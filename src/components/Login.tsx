import { useState, FormEvent } from 'react';
import { Lock, User, AlertCircle, KeyRound, ShieldAlert } from 'lucide-react';
import { UsuarioApp } from '../types';
import { apiLogin } from '../services/apiService';

interface LoginProps {
  usuarios: UsuarioApp[];
  onLogin: (usuario: UsuarioApp, token?: string) => void;
  onUpdateUsuarios: (updated: UsuarioApp[]) => void;
}

// Compute secure SHA-256 hash locally for offline login validation
async function computeLocalHash(username: string, pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(username.trim().toUpperCase() + ':' + pin.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function Login({ usuarios, onLogin, onUpdateUsuarios }: LoginProps) {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  // First time password change state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [tempUser, setTempUser] = useState<UsuarioApp | null>(null);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = username.trim().toUpperCase();
    const cleanPin = pin.trim();

    if (cleanUser.length !== 3) {
      setError('El usuario debe tener exactamente 3 letras.');
      return;
    }

    if (cleanPin.length !== 4 || !/^\d+$/.test(cleanPin)) {
      setError('La clave debe ser de exactamente 4 números.');
      return;
    }

    const isOnline = navigator.onLine;

    if (isOnline) {
      try {
        const response = await apiLogin(cleanUser, cleanPin);
        if (response.success) {
          const localPinHash = await computeLocalHash(cleanUser, cleanPin);
          const loggedUser = {
            ...response.user,
            localPinHash
          };

          if (loggedUser.esPrimeraVez) {
            setTempUser(loggedUser);
            setTempToken(response.token);
            setIsChangingPassword(true);
          } else {
            onLogin(loggedUser, response.token);
          }
        } else {
          setError('Usuario o clave incorrectos.');
        }
      } catch (err: any) {
        // Fallback to offline validation if network request fails
        if (err.message.includes('Failed to fetch') || err.message.includes('Error al iniciar') || err.message.includes('NetworkError')) {
          await handleOfflineLogin(cleanUser, cleanPin);
        } else {
          setError(err.message || 'Usuario o clave incorrectos.');
        }
      }
    } else {
      await handleOfflineLogin(cleanUser, cleanPin);
    }
  };

  const handleOfflineLogin = async (cleanUser: string, cleanPin: string) => {
    const foundUser = usuarios.find((u) => u.usuario.toUpperCase() === cleanUser);

    if (!foundUser) {
      setError('Usuario no encontrado localmente. Conéctate a internet para iniciar sesión.');
      return;
    }

    if (foundUser.activo === false) {
      setError('Este usuario se encuentra inhabilitado. Por favor, contacte a Soporte.');
      return;
    }

    const localPinHash = await computeLocalHash(cleanUser, cleanPin);
    const storedHash = (foundUser as any).localPinHash;

    if (!storedHash) {
      setError('No puedes iniciar sesión sin conexión por primera vez en este dispositivo. Conéctate a internet.');
      return;
    }

    if (storedHash === localPinHash) {
      onLogin(foundUser); // Offline session restore (no new token)
    } else {
      setError('Usuario o clave incorrectos.');
    }
  };

  const handlePasswordChangeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      setPasswordError('La nueva clave debe ser de exactamente 4 números.');
      return;
    }

    if (newPin === '1234') {
      setPasswordError('Por seguridad, no puedes usar la clave por defecto 1234.');
      return;
    }

    if (newPin !== confirmPin) {
      setPasswordError('Las claves no coinciden.');
      return;
    }

    if (!tempUser) return;

    const newLocalPinHash = await computeLocalHash(tempUser.usuario, newPin);

    // Save updated password
    const updatedUsers = usuarios.map((u) => {
      if (u.id === tempUser.id) {
        return {
          ...u,
          clave: newPin,
          localPinHash: newLocalPinHash,
          esPrimeraVez: false,
        };
      }
      return u;
    });

    if (tempToken) {
      localStorage.setItem('prenda_jwt_token', tempToken);
    }

    onUpdateUsuarios(updatedUsers);

    // Log in the user
    const updatedLoggedInUser = {
      ...tempUser,
      clave: newPin,
      localPinHash: newLocalPinHash,
      esPrimeraVez: false,
    };
    onLogin(updatedLoggedInUser, tempToken || undefined);
  };


  if (isChangingPassword && tempUser) {
    return (
      <div id="password-reset-screen" className="min-h-screen flex items-center justify-center bg-[#F1F5F9] px-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-md space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-500" />

          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-amber-50 text-amber-600 rounded-2xl mx-auto">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Cambio de Clave Obligatorio</h2>
            <p className="text-xs text-slate-500 font-medium">
              Por seguridad, al ingresar por primera vez debes definir una clave personalizada de 4 números.
            </p>
          </div>

          {passwordError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Usuario
              </span>
              <span className="text-sm font-extrabold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-md inline-block font-mono">
                {tempUser.usuario} ({tempUser.nombre})
              </span>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                <KeyRound className="h-3 w-3" /> Nueva Clave (4 números)
              </label>
              <input
                type="password"
                required
                maxLength={4}
                pattern="\d*"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Ej. 5832"
                className="w-full p-2.5 bg-[#FAFBFD] border border-[#CBD5E1] rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 text-center font-mono tracking-[1em]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                <KeyRound className="h-3 w-3" /> Confirmar Nueva Clave (4 números)
              </label>
              <input
                type="password"
                required
                maxLength={4}
                pattern="\d*"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Ej. 5832"
                className="w-full p-2.5 bg-[#FAFBFD] border border-[#CBD5E1] rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 text-center font-mono tracking-[1em]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-lg transition-all shadow-sm"
            >
              Guardar Nueva Clave e Ingresar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div id="login-screen" className="min-h-screen flex items-center justify-center bg-[#F1F5F9] px-4">
      <div className="max-w-md w-full bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-md space-y-6 relative overflow-hidden">
        {/* Background accent */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-600" />

        <div className="text-center space-y-2">
          <div className="inline-flex p-1 bg-white rounded-2xl mx-auto">
            <img src="/logos/plow-192x192.png" className="h-14 w-14 object-contain" alt="Plow Logo" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">ARARE S.A.S</h2>
          <p className="text-xs text-slate-500 font-medium">Ingresa a tu cuenta</p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
              <User className="h-3 w-3" /> Usuario (3 Letras)
            </label>
            <input
              type="text"
              required
              maxLength={3}
              value={username}
              onChange={(e) => setUsername(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
              placeholder="Ej. GEN"
              className="w-full p-2.5 bg-[#FAFBFD] border border-[#CBD5E1] rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center uppercase tracking-widest font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
              <Lock className="h-3 w-3" /> Clave (4 Números)
            </label>
            <input
              type="password"
              required
              maxLength={4}
              pattern="\d*"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Ej. 1234"
              className="w-full p-2.5 bg-[#FAFBFD] border border-[#CBD5E1] rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center font-mono tracking-[0.5em]"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-lg transition-all shadow-sm"
          >
            Iniciar Sesión
          </button>
        </form>


        <div className="pt-2 text-center">
          <p className="text-[10px] text-slate-400">
            ARARE S.A.S. • Toma de pedidos 1.0.2 • Crado por Yersi. 2026.
          </p>
        </div>
      </div>
    </div>
  );
}
