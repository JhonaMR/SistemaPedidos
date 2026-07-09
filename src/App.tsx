/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { 
  TrendingUp, 
  ShoppingBag, 
  Users, 
  FileText, 
  Settings, 
  Download, 
  Upload, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Database,
  Shirt,
  Package,
  LogOut,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Cliente, Pedido, UsuarioApp, Prenda, Campana } from './types';
import { db, PedidoOffline } from './services/db';
import {
  fetchServerData,
  apiSaveClientes,
  apiSavePedidos,
  apiSaveDeletedPedidos,
  apiSaveBackups,
  apiSaveVendedor,
  apiSavePrendas,
  apiSaveUsuarios,
  apiSaveCampanas,
  apiSaveCampanasReferencias
} from './services/apiService';
import Dashboard from './components/Dashboard';
import OrderForm from './components/OrderForm';
import OrderHistory from './components/OrderHistory';
import ClientSection from './components/ClientSection';
import Login from './components/Login';
import ReferenciasCatalog from './components/ReferenciasCatalog';

export function parseCampana(nombreCompleto: string): Campana {
  const match = nombreCompleto.match(/\d{4}/);
  const anio = match ? parseInt(match[0], 10) : 2026;
  const cleanName = nombreCompleto.replace(new RegExp(`\\s*${anio}\\s*`, 'g'), '').trim();
  const norm = cleanName.toLowerCase();
  
  let numero = 1;
  if (norm.includes('inicio')) numero = 1;
  else if (norm.includes('madre')) numero = 2;
  else if (norm.includes('vacacio') || norm.includes('vacac')) numero = 3;
  else if (norm.includes('temporad')) numero = 4;
  else numero = 5;

  return { nombre: cleanName, anio, numero };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'nuevo-pedido' | 'pedidos' | 'clientes' | 'configuracion' | 'referencias'>('dashboard');
  
  // Multi-User States
  const [usuarios, setUsuarios] = useState<UsuarioApp[]>(() => {
    const saved = localStorage.getItem('prenda_usuarios');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  const [currentUser, setCurrentUser] = useState<UsuarioApp | null>(() => {
    const saved = localStorage.getItem('prenda_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return null;
  });

  // Login & Campaign States
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('prenda_is_logged_in') === 'true';
  });
  const [activeCampana, setActiveCampana] = useState<string>(() => {
    const savedActive = localStorage.getItem('prenda_campana');
    if (savedActive) return savedActive;
    const savedAvail = localStorage.getItem('prenda_campanas_disponibles');
    if (savedAvail) {
      try {
        const parsed = JSON.parse(savedAvail);
        if (parsed && parsed.length > 0) {
          const first = parsed[0];
          if (typeof first === 'string') return first;
          return `${first.nombre} ${first.anio}`;
        }
      } catch (e) {}
    }
    return '';
  });
  const [showCampanaModal, setShowCampanaModal] = useState(false);
  const [selectedCampanaConfig, setSelectedCampanaConfig] = useState<string | null>(null);
  const [campanaRefSearch, setCampanaRefSearch] = useState('');
  const [selectedCampanaYear, setSelectedCampanaYear] = useState<string>('Todas');
  const [showNewCampanaModal, setShowNewCampanaModal] = useState(false);
  const [newCampanaName, setNewCampanaName] = useState('');
  const [newCampanaYear, setNewCampanaYear] = useState('');
  const [newCampanaNumber, setNewCampanaNumber] = useState('');
  const [selectedHeaderYear, setSelectedHeaderYear] = useState<number>(() => {
    const savedActive = localStorage.getItem('prenda_campana');
    if (savedActive) {
      const match = savedActive.match(/\d{4}/);
      if (match) return parseInt(match[0], 10);
    }
    return new Date().getFullYear();
  });

  useEffect(() => {
    if (activeCampana) {
      const match = activeCampana.match(/\d{4}/);
      if (match) {
        setSelectedHeaderYear(parseInt(match[0], 10));
      }
    }
  }, [activeCampana]);

  // Campaign references configuration state
  const [campanasDisponibles, setCampanasDisponibles] = useState<Campana[]>(() => {
    const saved = localStorage.getItem('prenda_campanas_disponibles');
    return saved ? JSON.parse(saved) : [];
  });

  const [campanasReferencias, setCampanasReferencias] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('prenda_campanas_referencias');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });

  const [importCampaign, setImportCampaign] = useState('');
  const [mappingCampaign, setMappingCampaign] = useState('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const handleLogin = (user: UsuarioApp) => {
    setCurrentUser(user);
    localStorage.setItem('prenda_current_user', JSON.stringify(user));

    const updatedVendedor = { 
      ...vendedor, 
      nombre: user.nombre, 
      codigo: `V-${user.usuario}` 
    };
    setVendedor(updatedVendedor);

    setIsLoggedIn(true);
    localStorage.setItem('prenda_is_logged_in', 'true');
    setShowCampanaModal(true);
    syncWithServer(clientes, pedidos, updatedVendedor);
  };

  const handleUpdateUsuarios = (updatedList: UsuarioApp[]) => {
    setUsuarios(updatedList);
    localStorage.setItem('prenda_usuarios', JSON.stringify(updatedList));

    // Sincronizar usuarios con el servidor
    syncWithServer(clientes, pedidos, null, null, null, updatedList);

    // Update logged-in user reference if current password changed
    if (currentUser) {
      const refreshed = updatedList.find(u => u.id === currentUser.id);
      if (refreshed) {
        setCurrentUser(refreshed);
        localStorage.setItem('prenda_current_user', JSON.stringify(refreshed));
      }
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem('prenda_is_logged_in');
    localStorage.removeItem('prenda_current_user');
    setActiveTab('dashboard');
  };

  // Database States (inicializados vacíos, se cargan de IndexedDB)
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [deletedPedidos, setDeletedPedidos] = useState<Pedido[]>(() => {
    const saved = localStorage.getItem('prenda_deleted_pedidos');
    return saved ? JSON.parse(saved) : [];
  });
  const [pedidoBackups, setPedidoBackups] = useState<Pedido[]>([]);
  const [catalogGarments, setCatalogGarments] = useState<Prenda[]>([]);

  const [editingPedido, setEditingPedido] = useState<Pedido | null>(null);

  const [vendedor, setVendedor] = useState({
    nombre: 'Vendedor Estrella',
    codigo: 'V-102'
  });

  // Server Integration status
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'local' | 'error'>('local');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDbLoaded, setIsDbLoaded] = useState(false);

  // Load from local db on mount, or sync initial data if empty
  useEffect(() => {
    fetchDataFromLocalOrServer();
  }, []);

  const fetchDataFromLocalOrServer = async () => {
    setLoading(true);
    try {
      // 1. Intentar cargar de IndexedDB
      const dbClientes = await db.clientes.toArray();
      const dbPrendas = await db.prendas.toArray();
      const dbPedidos = await db.pedidos.toArray();
      const dbUsuarios = await db.usuarios.toArray();
      const dbCampanas = await db.campanas.toArray();
      const dbCampanasRefs = await db.campanasReferencias.toArray();

      // Si no hay datos en IndexedDB local, los descargamos del servidor local para poblar la BD
      if (dbClientes.length === 0 && dbPrendas.length === 0) {
        console.log("[IndexedDB] Base de datos vacía. Inicializando desde el servidor local...");
        await inicializarIndexedDBDesdeServidor();
      } else {
        console.log("[IndexedDB] Cargando datos locales desde IndexedDB...");
        setClientes(dbClientes);
        setPedidos(dbPedidos);
        setCatalogGarments(dbPrendas);
        setUsuarios(dbUsuarios);

        // Migración local en caliente si falta anio o numero
        const migratedCampanas = dbCampanas.map(c => {
          let name = c.nombre;
          let anio = c.anio;
          let numero = c.numero;
          if (anio === undefined || numero === undefined) {
            const parsed = parseCampana(name);
            name = parsed.nombre;
            anio = parsed.anio;
            numero = parsed.numero;
          }
          return { nombre: name, anio, numero };
        });

        const needsSave = dbCampanas.some(c => c.anio === undefined || c.numero === undefined);
        if (needsSave) {
          await db.transaction('rw', db.campanas, async () => {
            await db.campanas.clear();
            await db.campanas.bulkAdd(migratedCampanas.map(c => ({ id: `${c.nombre} ${c.anio}`, nombre: c.nombre, anio: c.anio, numero: c.numero })));
          });
          if (navigator.onLine) {
            apiSaveCampanas(migratedCampanas);
          }
        }

        setCampanasDisponibles(migratedCampanas);

        // Mapear campañas y referencias
        const mappedRefs: Record<string, string[]> = {};
        dbCampanasRefs.forEach(cr => {
          mappedRefs[cr.campana] = cr.referencias;
        });
        setCampanasReferencias(mappedRefs);

        const savedDeleted = localStorage.getItem('prenda_deleted_pedidos');
        if (savedDeleted) {
          try { setDeletedPedidos(JSON.parse(savedDeleted)); } catch (e) {}
        }
        const savedBackups = localStorage.getItem('prenda_pedido_backups');
        if (savedBackups) {
          try { setPedidoBackups(JSON.parse(savedBackups)); } catch (e) {}
        }

        // Si hay vendedor guardado en el usuario actual de localStorage
        if (currentUser) {
          setVendedor({
            nombre: currentUser.nombre,
            codigo: currentUser.idVendedor || `V-${currentUser.usuario}`
          });
        }
        
        setSyncStatus('synced');
      }
    } catch (err: any) {
      console.error("Error al inicializar base de datos local:", err);
      setSyncStatus('error');
      setErrorMessage("No se pudo cargar la base de datos local (IndexedDB).");
    } finally {
      setLoading(false);
      setIsDbLoaded(true);
    }
  };

  const handleCreateCampana = async (e: FormEvent) => {
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

    const fullName = `${cleanName} ${yearVal}`;

    // Verify if name already exists in campaign list
    const exists = campanasDisponibles.some(
      c => `${c.nombre.toLowerCase()} ${c.anio}` === fullName.toLowerCase()
    );

    if (exists) {
      alert(`La campaña "${fullName}" ya existe.`);
      return;
    }

    const newCampanaObj: Campana = {
      nombre: cleanName,
      anio: yearVal,
      numero: numVal
    };

    const updatedCampanas = [...campanasDisponibles, newCampanaObj];
    
    // Set campaign references entry as empty for this new campaign
    const updatedRefs = {
      ...campanasReferencias,
      [fullName]: []
    };

    // Update React states
    setCampanasDisponibles(updatedCampanas);
    setCampanasReferencias(updatedRefs);
    
    // Save to localStorage for quick cache access
    localStorage.setItem('prenda_campanas_disponibles', JSON.stringify(updatedCampanas));
    localStorage.setItem('prenda_campanas_referencias', JSON.stringify(updatedRefs));

    // Save and sync with server/IndexedDB
    await syncWithServer(
      clientes, 
      pedidos, 
      null, 
      deletedPedidos, 
      pedidoBackups, 
      usuarios, 
      updatedCampanas, 
      updatedRefs
    );

    // Reset fields and close modal
    setNewCampanaName('');
    setNewCampanaYear('');
    setNewCampanaNumber('');
    setShowNewCampanaModal(false);
    alert(`Campaña "${fullName}" creada con éxito.`);
  };

  const inicializarIndexedDBDesdeServidor = async () => {
    try {
      const data = await fetchServerData();
      
      // Escribir en IndexedDB en una transacción limpia
      await db.transaction('rw', [db.clientes, db.prendas, db.usuarios, db.campanas, db.campanasReferencias, db.pedidos], async () => {
        await db.clientes.clear();
        await db.prendas.clear();
        await db.usuarios.clear();
        await db.campanas.clear();
        await db.campanasReferencias.clear();
        await db.pedidos.clear();

        if (data.clientes && data.clientes.length > 0) {
          await db.clientes.bulkAdd(data.clientes);
        }
        if (data.prendas && data.prendas.length > 0) {
          await db.prendas.bulkAdd(data.prendas);
        }
        if (data.usuarios && data.usuarios.length > 0) {
          await db.usuarios.bulkAdd(data.usuarios);
        }
        if (data.campanas && data.campanas.length > 0) {
          const mappedCampanas = data.campanas.map(c => {
            if (typeof c === 'string') {
              return parseCampana(c);
            }
            return {
              nombre: c.nombre,
              anio: c.anio || 2026,
              numero: c.numero || 1
            };
          });
          await db.campanas.bulkAdd(mappedCampanas.map(c => ({
            id: `${c.nombre} ${c.anio}`,
            nombre: c.nombre,
            anio: c.anio,
            numero: c.numero
          })));
        }
        if (data.campanasReferencias && Object.keys(data.campanasReferencias).length > 0) {
          const refsArray = Object.keys(data.campanasReferencias).map(key => ({
            campana: key,
            referencias: data.campanasReferencias[key]
          }));
          await db.campanasReferencias.bulkAdd(refsArray);
        }
        if (data.pedidos && data.pedidos.length > 0) {
          const mapped = data.pedidos.map(p => ({ ...p, sincronizado: 1 as const }));
          await db.pedidos.bulkAdd(mapped);
        }
      });

      // Refrescar estados de React con los datos recién insertados
      const dbClientes = await db.clientes.toArray();
      const dbPrendas = await db.prendas.toArray();
      const dbPedidos = await db.pedidos.toArray();
      const dbUsuarios = await db.usuarios.toArray();
      const dbCampanas = await db.campanas.toArray();
      const dbCampanasRefs = await db.campanasReferencias.toArray();

      setClientes(dbClientes);
      setPedidos(dbPedidos);
      setCatalogGarments(dbPrendas);
      setUsuarios(dbUsuarios);

      const migratedCampanas = dbCampanas.map(c => ({
        nombre: c.nombre,
        anio: c.anio,
        numero: c.numero
      }));
      setCampanasDisponibles(migratedCampanas);

      const mappedRefs: Record<string, string[]> = {};
      dbCampanasRefs.forEach(cr => {
        mappedRefs[cr.campana] = cr.referencias;
      });
      setCampanasReferencias(mappedRefs);

      if (data.deletedPedidos) {
        setDeletedPedidos(data.deletedPedidos);
        localStorage.setItem('prenda_deleted_pedidos', JSON.stringify(data.deletedPedidos));
      } else {
        setDeletedPedidos([]);
        localStorage.setItem('prenda_deleted_pedidos', '[]');
      }
      if (data.backups) {
        setPedidoBackups(data.backups);
        localStorage.setItem('prenda_pedido_backups', JSON.stringify(data.backups));
      } else {
        setPedidoBackups([]);
        localStorage.setItem('prenda_pedido_backups', '[]');
      }

      if (data.vendedor) {
        setVendedor(data.vendedor);
      } else if (currentUser) {
        setVendedor({
          nombre: currentUser.nombre,
          codigo: currentUser.idVendedor || `V-${currentUser.usuario}`
        });
      }

      setSyncStatus('synced');
    } catch (err: any) {
      console.error("Error al descargar datos de inicialización:", err);
      setSyncStatus('local');
      setErrorMessage("Trabajando en modo local desconectado.");
    }
  };

  const handleSincronizarPedidos = async () => {
    if (!navigator.onLine) {
      alert("No hay conexión a internet para sincronizar.");
      return;
    }
    
    setLoading(true);
    try {
      // Obtener pedidos no sincronizados
      const pendingOrders = await db.pedidos.where('sincronizado').equals(0).toArray();
      // Obtener clientes creados offline (cuyo id temporal empieza con cli_off_)
      const allClients = await db.clientes.toArray();
      const pendingClients = allClients.filter(c => c.id.startsWith('cli_off_'));

      // Llamar al endpoint del backend
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/pedidos/sync-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pedidos: pendingOrders,
          clientes: pendingClients
        })
      });

      if (!response.ok) {
        throw new Error('Error al sincronizar con el servidor');
      }

      const result = await response.json();

      // Forzar recarga completa y transparente desde el servidor
      await inicializarIndexedDBDesdeServidor();

      setSyncStatus('synced');
      alert(`Sincronización bidireccional exitosa.\n- Pedidos locales subidos: ${result.syncedOrderIds?.length || 0}\n- Clientes locales subidos: ${result.syncedClientIds?.length || 0}\n- Datos actualizados descargados desde el servidor.`);
    } catch (err: any) {
      console.error("Error durante la sincronización:", err);
      alert("Error al sincronizar con el servidor local: " + err.message);
      setSyncStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // Sync state to local storage and server when updated
  const syncWithServer = async (
    updatedClientes: Cliente[], 
    updatedPedidos: Pedido[], 
    updatedVendedor?: any, 
    updatedDeletedPedidos?: Pedido[],
    updatedBackups?: Pedido[],
    updatedUsuarios?: UsuarioApp[],
    updatedCampanas?: Campana[],
    updatedCampanasRefs?: Record<string, string[]>
  ) => {
    // 1. Guardar en IndexedDB usando Dexie
    try {
      await db.transaction('rw', [db.clientes, db.pedidos, db.usuarios, db.campanas, db.campanasReferencias], async () => {
        if (updatedClientes) {
          await db.clientes.clear();
          await db.clientes.bulkAdd(updatedClientes);
        }
        if (updatedPedidos) {
          const existingPending = await db.pedidos.where('sincronizado').equals(0).toArray();
          const pendingIds = new Set(existingPending.map(p => p.id));

          const mappedPedidos = updatedPedidos.map(p => {
            const isPending = (p as any).sincronizado === 0 || pendingIds.has(p.id);
            return {
              ...p,
              sincronizado: isPending ? 0 : 1
            } as PedidoOffline;
          });
          await db.pedidos.clear();
          await db.pedidos.bulkAdd(mappedPedidos);
        }
        if (updatedUsuarios) {
          await db.usuarios.clear();
          await db.usuarios.bulkAdd(updatedUsuarios);
        }
        if (updatedCampanas) {
          await db.campanas.clear();
          await db.campanas.bulkAdd(updatedCampanas.map(c => ({ id: `${c.nombre} ${c.anio}`, nombre: c.nombre, anio: c.anio, numero: c.numero })));
        }
        if (updatedCampanasRefs) {
          const refsArray = Object.keys(updatedCampanasRefs).map(key => ({
            campana: key,
            referencias: updatedCampanasRefs[key]
          }));
          await db.campanasReferencias.clear();
          await db.campanasReferencias.bulkAdd(refsArray);
        }
      });
    } catch (err) {
      console.error("Error al escribir en IndexedDB:", err);
    }

    // 2. Server API sync attempt
    if (navigator.onLine) {
      try {
        const p1 = apiSaveClientes(updatedClientes);
        const p2 = apiSavePedidos(updatedPedidos);
        let p3 = Promise.resolve(true);
        if (updatedDeletedPedidos) {
          p3 = apiSaveDeletedPedidos(updatedDeletedPedidos);
        }
        let p4 = Promise.resolve(true);
        if (updatedBackups) {
          p4 = apiSaveBackups(updatedBackups);
        }
        let p5 = Promise.resolve(true);
        if (updatedVendedor) {
          p5 = apiSaveVendedor(updatedVendedor);
        }
        let p6 = Promise.resolve(true);
        if (updatedUsuarios) {
          p6 = apiSaveUsuarios(updatedUsuarios);
        }
        let p7 = Promise.resolve(true);
        if (updatedCampanas) {
          p7 = apiSaveCampanas(updatedCampanas);
        }
        let p8 = Promise.resolve(true);
        if (updatedCampanasRefs) {
          p8 = apiSaveCampanasReferencias(updatedCampanasRefs);
        }

        const [r1, r2, r3, r4, r5, r6, r7, r8] = await Promise.all([p1, p2, p3, p4, p5, p6, p7, p8]);

        if (r1 && r2 && r3 && r4 && r5 && r6 && r7 && r8) {
          setSyncStatus('synced');
          setErrorMessage(null);
          // Marcar pedidos como sincronizados en local
          await db.pedidos.where('sincronizado').equals(0).modify({ sincronizado: 1 });
        } else {
          setSyncStatus('error');
        }
      } catch (err) {
        setSyncStatus('local'); // Fallback silently to offline mode
      }
    } else {
      setSyncStatus('local');
    }
  };

  // Client Handlers
  const handleAddCliente = async (newClienteData: Omit<Cliente, 'id' | 'fechaRegistro'>) => {
    const isOffline = !navigator.onLine;
    const idTemporal = `cli_off_${Date.now()}`;
    
    const newCliente: Cliente = {
      ...newClienteData,
      id: isOffline ? idTemporal : `cli_${Date.now()}`,
      codigoCliente: isOffline ? '000' : (newClienteData.codigoCliente || ''),
      fechaRegistro: new Date().toISOString().split('T')[0]
    };

    await db.clientes.put(newCliente);
    const updated = await db.clientes.toArray();
    setClientes(updated);
    await syncWithServer(updated, pedidos);
  };

  const handleEditCliente = async (updatedCliente: Cliente) => {
    await db.clientes.put(updatedCliente);
    const updated = await db.clientes.toArray();
    setClientes(updated);
    await syncWithServer(updated, pedidos);
  };

  const handleQuickAddCliente = (newClienteData: Omit<Cliente, 'id' | 'fechaRegistro'>): Cliente => {
    const isOffline = !navigator.onLine;
    const idTemporal = `cli_off_${Date.now()}`;
    
    const newCliente: Cliente = {
      ...newClienteData,
      id: isOffline ? idTemporal : `cli_${Date.now()}`,
      codigoCliente: isOffline ? '000' : (newClienteData.codigoCliente || ''),
      fechaRegistro: new Date().toISOString().split('T')[0]
    };

    db.clientes.put(newCliente).then(() => {
      db.clientes.toArray().then(setClientes);
    });

    return newCliente;
  };

  // Order Handlers
  const handleAddPedido = async (newPedidoData: Omit<Pedido, 'id' | 'numeroPedido' | 'fecha'>) => {
    const prefijoVendedor = currentUser?.idVendedor || vendedor.codigo.replace('V-', '') || '01';
    
    // Generar consecutivo temporal para evitar colisiones
    const orderNumber = `ASYNC-${prefijoVendedor}-${Date.now()}`;

    const newPedido: PedidoOffline = {
      ...newPedidoData,
      id: `ped_${Date.now()}`,
      numeroPedido: orderNumber,
      fecha: new Date().toISOString().split('T')[0],
      campana: activeCampana,
      sincronizado: 0 // local por defecto al crearse offline
    };

    await db.pedidos.put(newPedido);
    const updated = await db.pedidos.toArray();
    setPedidos(updated);
    localStorage.setItem('prenda_pedidos', JSON.stringify(updated));
    await syncWithServer(clientes, updated);
  };

  const handleUpdatePedidoStatus = async (orderId: string, status: Pedido['estado'], fechaCancelado?: string) => {
    const updated = pedidos.map(p => {
      if (p.id === orderId) {
        return { 
          ...p, 
          estado: status,
          fechaCancelado: status === 'Cancelado' ? (fechaCancelado || new Date().toISOString().split('T')[0]) : undefined
        };
      }
      return p;
    });
    setPedidos(updated);
    await syncWithServer(clientes, updated, null, deletedPedidos, pedidoBackups);
  };

  const handleDuplicatePedido = async (oldPedido: Pedido, targetClienteId: string) => {
    const client = clientes.find(c => c.id === targetClienteId);
    if (!client) {
      alert("Error: Cliente no encontrado.");
      return;
    }

    const prefijoVendedor = currentUser?.idVendedor || vendedor.codigo.replace('V-', '') || '01';
    
    const todosLosPedidos = await db.pedidos.toArray();
    const pedidosVendedor = todosLosPedidos.filter(p => p.numeroPedido.startsWith(`${prefijoVendedor}-`));
    
    let siguienteCorrelativo = 1;
    if (pedidosVendedor.length > 0) {
      const correlativos = pedidosVendedor.map(p => {
        const parts = p.numeroPedido.split('-');
        const corr = parseInt(parts[1], 10);
        return isNaN(corr) ? 0 : corr;
      });
      siguienteCorrelativo = Math.max(...correlativos) + 1;
    }
    
    const paddedNum = String(siguienteCorrelativo).padStart(3, '0');
    const orderNumber = `${prefijoVendedor}-${paddedNum}`;
    
    const duplicated: PedidoOffline = {
      ...oldPedido,
      id: `ped_${Date.now()}`,
      numeroPedido: orderNumber,
      clienteId: client.id,
      clienteNombre: client.nombre,
      clienteTelefono: client.telefono,
      fecha: new Date().toISOString().split('T')[0],
      estado: 'Pendiente',
      campana: activeCampana,
      sincronizado: 0
    };

    await db.pedidos.put(duplicated);
    const updated = await db.pedidos.toArray();
    setPedidos(updated);
    await syncWithServer(clientes, updated);
    setActiveTab('pedidos');
    alert(`Pedido duplicado con éxito como ${duplicated.numeroPedido} para el cliente ${client.nombre}`);
  };

  const handleUpdateCatalogGarments = (newList: Prenda[]) => {
    setCatalogGarments(newList);
    localStorage.setItem('prenda_catalog_garments', JSON.stringify(newList));
    apiSavePrendas(newList);
    
    // Auto-enable any newly created references in campanasReferencias
    setCampanasReferencias(prev => {
      const copy = { ...prev };
      newList.forEach(p => {
        Object.keys(copy).forEach(c => {
          if (!copy[c].includes(p.ref)) {
            copy[c] = [...copy[c], p.ref];
          }
        });
      });
      syncWithServer(clientes, pedidos, null, deletedPedidos, pedidoBackups, usuarios, campanasDisponibles, copy);
      return copy;
    });
  };

  const handleImportPrendasExcel = (file: File, selectedCampanaImport: string) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        
        const newPrendas: Prenda[] = [];
        const addedRefs: string[] = [];

        // Skip header row 1 (starts at index 1)
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          
          const ref = String(row[0] || '').trim().toUpperCase();
          if (!ref) continue;

          const price = parseFloat(String(row[1] || '0').replace(/[^0-9.-]+/g, '')) || 0;
          const nombre = String(row[2] || '').trim();
          const tag1 = String(row[3] || '').trim();
          const tag2 = String(row[4] || '').trim();

          if (!nombre) continue;

          // Resolve categories
          const categories: ('Dama' | 'Niña' | 'Niño' | 'Colegial' | 'Plus')[] = [];
          const validTags = ['Dama', 'Plus', 'Niña', 'Niño', 'Colegial'];
          if (validTags.includes(tag1)) {
            categories.push(tag1 as any);
          }
          if (validTags.includes(tag2) && !categories.includes(tag2 as any)) {
            categories.push(tag2 as any);
          }
          
          if (categories.length === 0) {
            categories.push('Dama');
          }

          // Generate tallas automatic
          const sizesSet = new Set<string>();
          if (categories.includes('Colegial')) {
            ['2-4', '6-8', '10-12', '14-16', 'S', 'M', 'L', 'XL', '2XL', '3XL'].forEach(s => sizesSet.add(s));
          }
          if (categories.includes('Dama')) {
            ['S', 'M', 'L'].forEach(s => sizesSet.add(s));
          }
          if (categories.includes('Plus')) {
            ['XL', '2XL', '3XL'].forEach(s => sizesSet.add(s));
          }
          if (categories.includes('Niña') || categories.includes('Niño')) {
            ['2-4', '6-8', '10-12', '14-16'].forEach(s => sizesSet.add(s));
          }

          const order = ['2-4', '6-8', '10-12', '14-16', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
          const tallasDisponibles = order.filter(s => sizesSet.has(s));

          newPrendas.push({
            ref,
            nombre,
            categoria: categories,
            precioBase: price,
            tallasDisponibles,
            stock: 100,
            imagenUrl: `/fotos_referencias/${ref}.jpg`
          });
          addedRefs.push(ref);
        }

        if (newPrendas.length === 0) {
          alert('No se encontraron filas con datos válidos en el archivo Excel.');
          return;
        }

        // Merge with garments list
        setCatalogGarments(prev => {
          const map = new Map<string, Prenda>();
          prev.forEach(p => map.set(p.ref, p));
          newPrendas.forEach(p => {
            if (map.has(p.ref)) {
              const existing = map.get(p.ref)!;
              map.set(p.ref, {
                ...existing,
                nombre: p.nombre,
                categoria: p.categoria,
                precioBase: p.precioBase,
                tallasDisponibles: p.tallasDisponibles,
                imagenUrl: existing.imagenUrl && existing.imagenUrl.startsWith('data:') ? existing.imagenUrl : `/fotos_referencias/${p.ref}.jpg`
              });
            } else {
              map.set(p.ref, p);
            }
          });
          const mergedList = Array.from(map.values());
          localStorage.setItem('prenda_catalog_garments', JSON.stringify(mergedList));
          apiSavePrendas(mergedList);
          
          if (selectedCampanaImport) {
            setCampanasReferencias(prevRefs => {
              const updated = { ...prevRefs };
              const currentCampaignRefs = updated[selectedCampanaImport] || [];
              const combined = Array.from(new Set([...currentCampaignRefs, ...addedRefs]));
              updated[selectedCampanaImport] = combined;
              
              syncWithServer(clientes, pedidos, mergedList, deletedPedidos, pedidoBackups, usuarios, campanasDisponibles, updated);
              return updated;
            });
          } else {
            syncWithServer(clientes, pedidos, mergedList, deletedPedidos, pedidoBackups, usuarios, campanasDisponibles, campanasReferencias);
          }
          
          return mergedList;
        });

        alert(`¡Importación exitosa! Se procesaron ${newPrendas.length} referencias.${selectedCampanaImport ? ` Asociadas a la campaña "${selectedCampanaImport}".` : ''}`);
      } catch (err: any) {
        console.error(err);
        alert('Error al leer el archivo de Excel. Asegúrate de usar la plantilla correcta.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImportClientesExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        const newClientes: Cliente[] = [];

        // Skip header row 1 (starts at index 1)
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          let codigo = String(row[0] || '').trim();
          const nombre = String(row[1] || '').trim();
          const nit = String(row[2] || '').trim();
          const direccion = String(row[3] || '').trim();
          const ciudad = String(row[4] || '').trim() || 'Sin especificar';
          const limite = String(row[5] || '').trim();
          const nota = String(row[6] || '').trim();

          if (!codigo || !nombre) continue;
          if (/^\d+$/.test(codigo)) {
            codigo = codigo.padStart(3, '0');
          }

          newClientes.push({
            id: `cli_${codigo}`,
            codigoCliente: codigo,
            documentoIdentidad: nit || codigo,
            nombre,
            direccion,
            ciudad,
            limiteFacturacion: limite || 'N/A',
            notas: nota || '',
            telefono: 'N/A',
            correo: 'N/A',
            fechaRegistro: new Date().toISOString().split('T')[0]
          });
        }

        if (newClientes.length === 0) {
          alert('No se encontraron filas con clientes válidos en el archivo Excel.');
          return;
        }

        setClientes(prev => {
          const map = new Map<string, Cliente>();
          prev.forEach(c => map.set(c.id, c));
          newClientes.forEach(c => {
            if (map.has(c.id)) {
              map.set(c.id, {
                ...map.get(c.id)!,
                codigoCliente: c.codigoCliente,
                documentoIdentidad: c.documentoIdentidad,
                nombre: c.nombre,
                direccion: c.direccion,
                ciudad: c.ciudad,
                limiteFacturacion: c.limiteFacturacion,
                notas: c.notas
              });
            } else {
              map.set(c.id, c);
            }
          });
          const mergedList = Array.from(map.values());
          localStorage.setItem('prenda_clientes', JSON.stringify(mergedList));
          
          syncWithServer(mergedList, pedidos, catalogGarments, deletedPedidos, pedidoBackups, usuarios, campanasDisponibles, campanasReferencias);
          return mergedList;
        });

        alert(`¡Importación exitosa! Se procesaron ${newClientes.length} clientes.`);
      } catch (err: any) {
        console.error(err);
        alert('Error al leer el archivo de Excel. Asegúrate de usar la plantilla correcta.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImportCampanaMapeoExcel = (file: File, selectedCampanaMapping: string) => {
    if (!selectedCampanaMapping) {
      alert('Por favor selecciona una campaña.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        const refsToImport: string[] = [];
        const missingFromCatalog: string[] = [];

        // Skip header row 1 (starts at index 1)
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const ref = String(row[0] || '').trim().toUpperCase();
          if (!ref) continue;

          refsToImport.push(ref);

          const existsInCatalog = catalogGarments.some(p => p.ref === ref);
          if (!existsInCatalog) {
            missingFromCatalog.push(ref);
          }
        }

        if (refsToImport.length === 0) {
          alert('No se encontraron referencias en la columna A de la plantilla.');
          return;
        }

        setCampanasReferencias(prev => {
          const updated = { ...prev };
          const currentCampaignRefs = updated[selectedCampanaMapping] || [];
          const combined = Array.from(new Set([...currentCampaignRefs, ...refsToImport]));
          updated[selectedCampanaMapping] = combined;

          syncWithServer(clientes, pedidos, catalogGarments, deletedPedidos, pedidoBackups, usuarios, campanasDisponibles, updated);
          
          if (missingFromCatalog.length > 0) {
            const warningMsg = `¡Mapeo importado con éxito!\n\nSe asociaron ${refsToImport.length} referencias a la campaña "${selectedCampanaMapping}".\n\n⚠️ AVISO: Las siguientes ${missingFromCatalog.length} referencias no existen aún en el catálogo general:\n${missingFromCatalog.join(', ')}`;
            alert(warningMsg);
          } else {
            alert(`¡Mapeo importado con éxito! Se asociaron ${refsToImport.length} referencias a la campaña "${selectedCampanaMapping}".`);
          }

          return updated;
        });

      } catch (err: any) {
        console.error(err);
        alert('Error al leer el archivo de Excel. Asegúrate de usar la plantilla correcta.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDeletePedido = (orderId: string) => {
    const orderToDelete = pedidos.find(p => p.id === orderId);
    if (!orderToDelete) return;

    const orderWithDeletionDate: Pedido = {
      ...orderToDelete,
      fechaEliminacion: new Date().toLocaleString('es-CO')
    };

    const updatedPedidos = pedidos.filter(p => p.id !== orderId);
    const updatedDeleted = [orderWithDeletionDate, ...deletedPedidos];

    setPedidos(updatedPedidos);
    setDeletedPedidos(updatedDeleted);
    
    localStorage.setItem('prenda_pedidos', JSON.stringify(updatedPedidos));
    localStorage.setItem('prenda_deleted_pedidos', JSON.stringify(updatedDeleted));

    syncWithServer(clientes, updatedPedidos, null, updatedDeleted, pedidoBackups);
  };

  const handleRestorePedido = (orderId: string) => {
    const orderToRestore = deletedPedidos.find(p => p.id === orderId);
    if (!orderToRestore) return;

    const { fechaEliminacion, ...restoredOrder } = orderToRestore as any;

    const updatedDeleted = deletedPedidos.filter(p => p.id !== orderId);
    const updatedPedidos = [restoredOrder as Pedido, ...pedidos];

    setPedidos(updatedPedidos);
    setDeletedPedidos(updatedDeleted);
    
    localStorage.setItem('prenda_pedidos', JSON.stringify(updatedPedidos));
    localStorage.setItem('prenda_deleted_pedidos', JSON.stringify(updatedDeleted));

    syncWithServer(clientes, updatedPedidos, null, updatedDeleted, pedidoBackups);
  };

  const handlePermanentDeletePedido = (orderId: string) => {
    const updatedDeleted = deletedPedidos.filter(p => p.id !== orderId);
    setDeletedPedidos(updatedDeleted);
    localStorage.setItem('prenda_deleted_pedidos', JSON.stringify(updatedDeleted));
    syncWithServer(clientes, pedidos, null, updatedDeleted, pedidoBackups);
  };

  const handleEmptyTrash = () => {
    setDeletedPedidos([]);
    localStorage.setItem('prenda_deleted_pedidos', '[]');
    syncWithServer(clientes, pedidos, null, [], pedidoBackups);
    alert('¡La papelera ha sido vaciada por completo!');
  };

  const handleEditPedido = (pedido: Pedido) => {
    setEditingPedido(pedido);
    setActiveTab('nuevo-pedido');
  };

  const handleUpdatePedido = (updated: Pedido) => {
    const oldVersion = pedidos.find(p => p.id === updated.id);
    let updatedBackups = pedidoBackups;
    if (oldVersion) {
      const backupItem: Pedido = {
        ...oldVersion,
        backupOf: oldVersion.id,
        backupFecha: new Date().toLocaleString('es-CO'),
        esBackup: true
      };
      updatedBackups = [backupItem, ...pedidoBackups];
      setPedidoBackups(updatedBackups);
    }

    const updatedList = pedidos.map(p => p.id === updated.id ? { ...updated, editado: true } : p);
    setPedidos(updatedList);
    setEditingPedido(null);
    localStorage.setItem('prenda_pedidos', JSON.stringify(updatedList));
    localStorage.setItem('prenda_pedido_backups', JSON.stringify(updatedBackups));
    syncWithServer(clientes, updatedList, null, deletedPedidos, updatedBackups);
    setActiveTab('pedidos');
  };

  // Salesperson configuration handler
  const handleSaveVendedor = (e: FormEvent) => {
    e.preventDefault();
    syncWithServer(clientes, pedidos, vendedor);
    alert('Configuración del vendedor guardada en el servidor.');
  };

  // Import / Export Data as Backup JSON
  const handleExportData = () => {
    const dataStr = JSON.stringify({ clientes, pedidos, vendedor }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `backup_pedidos_sastreria_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportData = (e: ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.clientes && parsed.pedidos) {
            setClientes(parsed.clientes);
            setPedidos(parsed.pedidos);
            if (parsed.vendedor) setVendedor(parsed.vendedor);
            syncWithServer(parsed.clientes, parsed.pedidos, parsed.vendedor || vendedor);
            alert('¡Copia de seguridad importada y sincronizada correctamente!');
          } else {
            alert('Formato de archivo inválido. Asegúrese de que sea un respaldo legítimo.');
          }
        } catch (err) {
          alert('Error de sintaxis al procesar el JSON.');
        }
      };
    }
  };

  const visiblePedidos = currentUser?.rol === 'soporte'
    ? pedidos
    : pedidos.filter(p => p.vendedorNombre === currentUser?.nombre);

  const visibleDeletedPedidos = currentUser?.rol === 'soporte'
    ? deletedPedidos
    : deletedPedidos.filter(p => p.vendedorNombre === currentUser?.nombre);

  if (!isLoggedIn) {
    return (
      <Login 
        usuarios={usuarios} 
        onLogin={handleLogin} 
        onUpdateUsuarios={handleUpdateUsuarios} 
      />
    );
  }
  const filteredCampanasReferencias: Record<string, string[]> = {};
  campanasDisponibles.forEach(c => {
    const fullName = `${c.nombre} ${c.anio}`;
    filteredCampanasReferencias[fullName] = campanasReferencias[fullName] || [];
  });

  return (
    <div id="app-root-layout" className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans antialiased relative">
      {/* Campaign Selector Modal overlay */}
      {showCampanaModal && (
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
                    onClick={() => {
                      setActiveCampana(fullName);
                      localStorage.setItem('prenda_campana', fullName);
                    }}
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
              onClick={() => setShowCampanaModal(false)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm transition-all text-center"
            >
              Confirmar Campaña y Entrar
            </button>
          </div>
        </div>
      )}

      {/* Campaign References configuration modal */}
      {selectedCampanaConfig && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4 relative flex flex-col max-h-[90vh] text-left">
            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600" />
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Package className="h-5 w-5 text-indigo-600" />
                  <span>Referencias - {selectedCampanaConfig}</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Selecciona qué prendas están cargadas como activas para la toma de pedidos en esta campaña.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCampanaConfig(null)}
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
              {currentUser?.rol === 'soporte' && (
                <div className="flex gap-2 w-full sm:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...campanasReferencias };
                      updated[selectedCampanaConfig] = catalogGarments.map(p => p.ref);
                      setCampanasReferencias(updated);
                      syncWithServer(clientes, pedidos, null, deletedPedidos, pedidoBackups, usuarios, campanasDisponibles, updated);
                    }}
                    className="flex-1 sm:flex-initial px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-extrabold uppercase rounded-lg text-center"
                  >
                    Habilitar Todas
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...campanasReferencias };
                      updated[selectedCampanaConfig] = [];
                      setCampanasReferencias(updated);
                      syncWithServer(clientes, pedidos, null, deletedPedidos, pedidoBackups, usuarios, campanasDisponibles, updated);
                    }}
                    className="flex-1 sm:flex-initial px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-extrabold uppercase rounded-lg text-center"
                  >
                    Deshabilitar Todas
                  </button>
                </div>
              )}
            </div>

            {/* References Table Scroll Container */}
            <div className="overflow-y-auto flex-1 border border-slate-100 rounded-xl divide-y divide-slate-50">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[9px] uppercase tracking-wider text-slate-400 font-extrabold sticky top-0">
                    <th className="p-3">Referencia y Nombre</th>
                    <th className="p-3 text-right">Precio de lista</th>
                    <th className="p-3 text-center w-28">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {catalogGarments.filter(p => {
                    const query = campanaRefSearch.trim().toLowerCase();
                    if (!query) return true;
                    return p.ref.toLowerCase().includes(query) || p.nombre.toLowerCase().includes(query);
                  }).map((prenda) => {
                    const isEnabled = (campanasReferencias[selectedCampanaConfig] || []).includes(prenda.ref);
                    
                    const handleToggle = () => {
                      if (currentUser?.rol !== 'soporte') return;
                      const updated = { ...campanasReferencias };
                      const currentRefs = updated[selectedCampanaConfig] || [];
                      if (isEnabled) {
                        updated[selectedCampanaConfig] = currentRefs.filter(ref => ref !== prenda.ref);
                      } else {
                        updated[selectedCampanaConfig] = [...currentRefs, prenda.ref];
                      }
                      setCampanasReferencias(updated);
                      syncWithServer(clientes, pedidos, null, deletedPedidos, pedidoBackups, usuarios, campanasDisponibles, updated);
                    };

                    const isSoporte = currentUser?.rol === 'soporte';

                    return (
                      <tr key={prenda.ref} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-semibold text-slate-800">
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-600 mr-2">
                            {prenda.ref}
                          </span>
                          <span>{prenda.nombre}</span>
                          <span className="block text-[9px] text-slate-400 font-normal mt-0.5">{Array.isArray(prenda.categoria) ? prenda.categoria.join(' / ') : prenda.categoria}</span>
                        </td>
                        <td className="p-3 text-right font-bold text-indigo-600">
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(prenda.precioBase)}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={handleToggle}
                            disabled={!isSoporte}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all border ${
                              !isSoporte 
                                ? isEnabled 
                                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-600 cursor-not-allowed'
                                  : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                                : isEnabled
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                                  : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
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
                onClick={() => setSelectedCampanaConfig(null)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm transition-all"
              >
                Aceptar y Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header Design Line */}
      <div className="h-1 bg-indigo-600 w-full" />

      {/* Main navigation & content container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Top Navbar */}
        <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-5 mb-6 gap-4 bg-white p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 text-white rounded-xl">
              <Shirt className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-950 flex flex-col sm:flex-row sm:items-center gap-2">
                <span>Arare S.A.S.</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">Gestión y Toma de Pedidos para Vendedores</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Campaign Selectors: Year & Campaign */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Año:</span>
              <select
                id="header-year-selector"
                value={selectedHeaderYear}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setSelectedHeaderYear(val);
                  
                  // Auto-select first campaign of this year
                  const campaignsForYear = campanasDisponibles
                    .filter(c => c.anio === val)
                    .sort((a, b) => a.numero - b.numero);
                  
                  if (campaignsForYear.length > 0) {
                    const newActive = `${campaignsForYear[0].nombre} ${campaignsForYear[0].anio}`;
                    setActiveCampana(newActive);
                    localStorage.setItem('prenda_campana', newActive);
                  } else {
                    setActiveCampana('');
                    localStorage.setItem('prenda_campana', '');
                  }
                }}
                className="p-1.5 px-2 bg-[#FAFBFD] border border-[#CBD5E1] rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
                <option value={2028}>2028</option>
                <option value={2029}>2029</option>
              </select>

              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 ml-1">Campaña:</span>
              <select
                id="header-campana-selector"
                value={activeCampana}
                onChange={(e) => {
                  const newCampana = e.target.value;
                  setActiveCampana(newCampana);
                  localStorage.setItem('prenda_campana', newCampana);
                }}
                className="p-1.5 px-3 bg-[#FAFBFD] border border-[#CBD5E1] rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                {campanasDisponibles.filter(c => c.anio === selectedHeaderYear).length === 0 && (
                  <option value="">-- Sin campañas --</option>
                )}
                {[...campanasDisponibles]
                  .filter(c => c.anio === selectedHeaderYear)
                  .sort((a, b) => a.numero - b.numero)
                  .map((c) => (
                    <option key={`${c.nombre} ${c.anio}`} value={`${c.nombre} ${c.anio}`}>
                      {c.nombre} {c.anio}
                    </option>
                  ))}
              </select>
            </div>

            {/* Sync Pill status */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold bg-slate-50">
              {loading ? (
                <>
                  <RefreshCw className="h-3 w-3 text-indigo-500 animate-spin" />
                  <span className="text-slate-600">Procesando...</span>
                </>
              ) : syncStatus === 'synced' ? (
                <>
                  <Database className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Conectado (Servidor)</span>
                </>
              ) : (
                <>
                  <Database className="h-3.5 w-3.5 text-amber-600" />
                  <span className="text-amber-700">Offline (Local)</span>
                </>
              )}
            </div>

            {/* Sincronizar Button */}
            <button
              id="btn-trigger-sync"
              onClick={handleSincronizarPedidos}
              title="Sincronizar pedidos pendientes con el servidor"
              className="py-1.5 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sincronizar</span>
            </button>

            {/* Logout button */}
            <button
              id="btn-header-logout"
              onClick={handleLogout}
              title="Cerrar Sesión"
              className="p-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Tab Selection Navigation Bar */}
        <nav className="flex overflow-x-auto pb-2 border-b border-slate-200 mb-6 gap-1 scrollbar-none">
          <button
            id="tab-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'dashboard'
                ? 'bg-[#1E293B] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Inicio</span>
          </button>

          <button
            id="tab-nuevo-pedido"
            onClick={() => setActiveTab('nuevo-pedido')}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'nuevo-pedido'
                ? 'bg-[#1E293B] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Registrar Pedido</span>
          </button>

          <button
            id="tab-pedidos"
            onClick={() => setActiveTab('pedidos')}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'pedidos'
                ? 'bg-[#1E293B] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Histórico de Pedidos</span>
            {pedidos.length > 0 && (
              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black py-0.5 px-2 rounded-full">
                {pedidos.length}
              </span>
            )}
          </button>

          <button
            id="tab-clientes"
            onClick={() => setActiveTab('clientes')}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'clientes'
                ? 'bg-[#1E293B] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Histórico de Clientes</span>
          </button>

          <button
            id="tab-referencias"
            onClick={() => setActiveTab('referencias')}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'referencias'
                ? 'bg-[#1E293B] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>Referencias</span>
          </button>

          {currentUser?.rol === 'soporte' && (
            <button
              id="tab-configuracion"
              onClick={() => setActiveTab('configuracion')}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 ${
                activeTab === 'configuracion'
                  ? 'bg-[#1E293B] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Configuración</span>
            </button>
          )}
        </nav>

        {/* Tab content renderer */}
        <section id="tab-content-area" className="transition-opacity duration-150">
          {activeTab === 'dashboard' && (
            <Dashboard 
              pedidos={visiblePedidos} 
              vendedor={vendedor} 
              currentUser={currentUser}
              activeCampana={activeCampana}
              onNavigateToRegister={() => setActiveTab('nuevo-pedido')} 
            />
          )}

          {activeTab === 'nuevo-pedido' && (
            <OrderForm 
              clientes={clientes} 
              onAddPedido={handleAddPedido} 
              onQuickAddCliente={handleQuickAddCliente}
              vendedor={{ ...vendedor, nombre: currentUser?.nombre || vendedor.nombre, codigo: currentUser?.usuario || vendedor.codigo }}
              pedidos={pedidos}
              activeCampana={activeCampana}
              campanasReferencias={filteredCampanasReferencias}
              catalogGarments={catalogGarments}
              editingPedido={editingPedido}
              onUpdatePedido={handleUpdatePedido}
              onCancel={() => {
                setEditingPedido(null);
                setActiveTab('dashboard');
              }}
            />
          )}

          {activeTab === 'pedidos' && (
            <OrderHistory 
              pedidos={visiblePedidos} 
              clientes={clientes}
              catalogGarments={catalogGarments}
              onUpdateStatus={handleUpdatePedidoStatus}
              onDuplicatePedido={handleDuplicatePedido}
              currentUser={currentUser}
              deletedPedidos={visibleDeletedPedidos}
              onDeletePedido={handleDeletePedido}
              onRestorePedido={handleRestorePedido}
              onPermanentDelete={handlePermanentDeletePedido}
              onEditPedido={handleEditPedido}
              backups={pedidoBackups}
              onEmptyTrash={handleEmptyTrash}
            />
          )}

          {activeTab === 'clientes' && (
            <ClientSection 
              clientes={clientes} 
              pedidos={visiblePedidos} 
              onAddCliente={handleAddCliente}
              onEditCliente={handleEditCliente}
            />
          )}

          {activeTab === 'referencias' && (
            <ReferenciasCatalog 
              prendas={catalogGarments}
              onUpdatePrendas={handleUpdateCatalogGarments}
              currentUser={currentUser}
              activeCampana={activeCampana}
              campanasReferencias={filteredCampanasReferencias}
              campanasDisponibles={campanasDisponibles}
            />
          )}

          {activeTab === 'configuracion' && currentUser?.rol === 'soporte' && (
            <div id="settings-page" className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {currentUser?.rol === 'soporte' && (
                <>
                  {/* Right Column: Database backup import/export */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 col-span-1 md:col-span-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-950 uppercase tracking-wider">Copia de Seguridad & Portabilidad</h3>
                      <p className="text-xs text-slate-500 mt-1">Exporte su catálogo de pedidos y listado de clientes a un archivo local de forma segura.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          El sistema mantiene la sincronización en el almacenamiento persistente del servidor y la memoria caché de su navegador. Para migrar de dispositivo o realizar una copia offline, use los controles de respaldo a continuación.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Export */}
                        <button
                          id="btn-export-backup"
                          onClick={handleExportData}
                          className="py-3 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                          <span>Exportar JSON</span>
                        </button>

                        {/* Import */}
                        <label className="py-3 px-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-700 flex items-center justify-center gap-2 transition-colors cursor-pointer text-center">
                          <Upload className="h-4 w-4" />
                          <span>Importar Respaldo</span>
                          <input
                            type="file"
                            accept=".json"
                            onChange={handleImportData}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Excel Imports Card */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 col-span-1 md:col-span-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="text-base font-bold text-slate-950 uppercase tracking-wider flex items-center gap-2">
                          <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                          <span>Importación Rápida desde Excel</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">Cargue masivamente datos de referencias y clientes utilizando archivos de Excel.</p>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => setShowTemplateModal(true)}
                        className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 self-start sm:self-auto shadow-3xs"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Descargar Plantillas de Ejemplo</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Column 1: References Importer */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5 flex flex-col justify-between text-left">
                        <div className="space-y-2">
                          <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider block font-mono">1. Cargar Referencias</span>
                          <h4 className="text-xs font-bold text-slate-800">Catálogo de Prendas</h4>
                          <p className="text-[11px] text-slate-500 leading-normal">
                            Importa prendas al catálogo. Asigna automáticamente tallas a partir de las etiquetas de Excel.
                          </p>

                          <div className="space-y-1 pt-1.5">
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Campaña de Destino (Opcional)</label>
                            <select
                              value={importCampaign}
                              onChange={(e) => setImportCampaign(e.target.value)}
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                            >
                              <option value="">-- No asociar a ninguna campaña --</option>
                              {[...campanasDisponibles].sort((a, b) => a.numero - b.numero).map(c => (
                                <option key={`${c.nombre} ${c.anio}`} value={`${c.nombre} ${c.anio}`}>{c.nombre} {c.anio}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <label className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-3xs">
                          <Upload className="h-4 w-4" />
                          <span>Seleccionar Excel</span>
                          <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImportPrendasExcel(file, importCampaign);
                              e.target.value = '';
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {/* Column 2: Campaign Mappings */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5 flex flex-col justify-between text-left">
                        <div className="space-y-2">
                          <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider block font-mono">2. Vincular a Campaña</span>
                          <h4 className="text-xs font-bold text-slate-800">Habilitar Referencias</h4>
                          <p className="text-[11px] text-slate-500 leading-normal">
                            Asocia una lista de referencias en lote a una campaña específica del taller.
                          </p>

                          <div className="space-y-1 pt-1.5">
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Campaña Destino *</label>
                            <select
                              value={mappingCampaign}
                              onChange={(e) => setMappingCampaign(e.target.value)}
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                            >
                              <option value="">-- Selecciona Campaña --</option>
                              {[...campanasDisponibles].sort((a, b) => a.numero - b.numero).map(c => (
                                <option key={`${c.nombre} ${c.anio}`} value={`${c.nombre} ${c.anio}`}>{c.nombre} {c.anio}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <label className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-3xs">
                          <Upload className="h-4 w-4" />
                          <span>Seleccionar Excel</span>
                          <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (!mappingCampaign) {
                                  alert('Por favor selecciona una campaña antes de importar.');
                                  return;
                                }
                                handleImportCampanaMapeoExcel(file, mappingCampaign);
                              }
                              e.target.value = '';
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {/* Column 3: Clients Importer */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5 flex flex-col justify-between text-left">
                        <div className="space-y-2">
                          <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider block font-mono">3. Cargar Clientes</span>
                          <h4 className="text-xs font-bold text-slate-800">Directorio de Clientes</h4>
                          <p className="text-[11px] text-slate-500 leading-normal">
                            Importa masivamente el listado de clientes de la base de datos del taller.
                          </p>
                        </div>

                        <label className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-3xs mt-auto">
                          <Upload className="h-4 w-4" />
                          <span>Seleccionar Excel</span>
                          <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImportClientesExcel(file);
                              e.target.value = '';
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Crear Nuevos Usuarios section - Only for support users */}
              {currentUser?.rol === 'soporte' && (
                <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-950 uppercase tracking-wider flex items-center gap-2">
                      <Users className="h-5 w-5 text-indigo-600" />
                      <span>Crear Nuevos Usuarios</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Cree usuarios generales. Podrán ingresar utilizando sus 3 letras asignadas y la clave inicial por defecto <strong>1234</strong>. Al ingresar por primera vez, se les solicitará obligatoriamente cambiar su clave.
                    </p>
                  </div>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const nombreInput = form.elements.namedItem('nuevoNombre') as HTMLInputElement;
                      const usuarioInput = form.elements.namedItem('nuevoUsuario') as HTMLInputElement;
                      
                      const cleanNombre = nombreInput.value.trim();
                      const cleanUsuario = usuarioInput.value.trim().toUpperCase();

                      if (cleanUsuario.length !== 3) {
                        alert('El usuario debe tener exactamente 3 letras.');
                        return;
                      }

                      if (usuarios.some(u => u.usuario.toUpperCase() === cleanUsuario)) {
                        alert(`El usuario ${cleanUsuario} ya existe en el sistema.`);
                        return;
                      }

                      const vendedoresExistentes = usuarios.filter(u => u.rol === 'general');
                      const consecutivo = String(vendedoresExistentes.length + 1).padStart(2, '0');

                      const newUser: UsuarioApp = {
                        id: `usr_${Date.now()}`,
                        nombre: cleanNombre,
                        usuario: cleanUsuario,
                        clave: '1234',
                        rol: 'general',
                        esPrimeraVez: true,
                        activo: true,
                        idVendedor: consecutivo
                      };

                      const updatedList = [...usuarios, newUser];
                      handleUpdateUsuarios(updatedList);
                      
                      alert(`Usuario ${cleanUsuario} creado con éxito. ID Vendedor asignado: ${consecutivo}. Clave inicial: 1234`);
                      form.reset();
                    }}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-100"
                  >
                    <div className="sm:col-span-6">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Nombre Completo</label>
                      <input
                        type="text"
                        name="nuevoNombre"
                        required
                        placeholder="Ej. Juan Pérez"
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Usuario (3 letras)</label>
                      <input
                        type="text"
                        name="nuevoUsuario"
                        required
                        maxLength={3}
                        placeholder="Ej. JPR"
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs uppercase"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors shadow-sm"
                      >
                        Crear
                      </button>
                    </div>
                  </form>

                  <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">
                          <th className="p-3">Nombre Completo</th>
                          <th className="p-3">Usuario (Código)</th>
                          <th className="p-3 text-center">ID Vendedor</th>
                          <th className="p-3">Rol</th>
                          <th className="p-3 text-center">Clave Configurada</th>
                          <th className="p-3 text-center">Estado</th>
                          <th className="p-3 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {usuarios.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-semibold text-slate-800">{u.nombre}</td>
                            <td className="p-3"><span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold text-slate-700">{u.usuario}</span></td>
                            <td className="p-3 text-center"><span className="font-mono font-bold text-indigo-600">{u.idVendedor || 'N/A'}</span></td>
                            <td className="p-3 font-semibold text-slate-600 capitalize">{u.rol}</td>
                            <td className="p-3 text-center font-mono font-medium">{u.clave}</td>
                            <td className="p-3 text-center">
                              <div className="flex flex-col gap-1 items-center justify-center">
                                {u.activo !== false ? (
                                  <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[9px] font-bold">Habilitado</span>
                                ) : (
                                  <span className="inline-block px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[9px] font-bold">Inhabilitado</span>
                                )}
                                {u.esPrimeraVez && u.activo !== false && (
                                  <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[9px] font-bold">Pendiente Primer Ingreso</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              {u.rol !== 'soporte' ? (
                                <button
                                  id={`btn-toggle-user-${u.usuario}`}
                                  type="button"
                                  onClick={() => {
                                    const isCurrentlyActive = u.activo !== false;
                                    const updatedList = usuarios.map(user => {
                                      if (user.id === u.id) {
                                        return { ...user, activo: !isCurrentlyActive };
                                      }
                                      return user;
                                    });
                                    handleUpdateUsuarios(updatedList);
                                    alert(`Usuario ${u.usuario} ha sido ${!isCurrentlyActive ? 'habilitado' : 'inhabilitado'}.`);
                                  }}
                                  className={`px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide rounded-md transition-colors ${
                                    u.activo !== false
                                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                  }`}
                                >
                                  {u.activo !== false ? 'Inhabilitar' : 'Habilitar'}
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic font-medium">N/A</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Control de Campañas - Full Row */}
              <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-950 uppercase tracking-wider flex items-center gap-2">
                      <Package className="h-5 w-5 text-indigo-600" />
                      <span>Control de Campañas</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Gestione la lista de campañas comerciales y configure qué referencias del catálogo están activas y autorizadas para cada campaña.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
                    <div className="flex items-center gap-2 bg-slate-50/50 border border-slate-200 rounded-lg p-1 px-2.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Filtrar Año:</span>
                      <select
                        id="select-campana-year-filter"
                        value={selectedCampanaYear}
                        onChange={(e) => setSelectedCampanaYear(e.target.value)}
                        className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                      >
                        <option value="Todas">Todas</option>
                        {Array.from(new Set(campanasDisponibles.map(c => String(c.anio)))).sort().map(yr => (
                          <option key={yr} value={yr}>{yr}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setNewCampanaName('');
                        setNewCampanaYear(String(new Date().getFullYear()));
                        // Auto calculate next number
                        const maxNum = campanasDisponibles.reduce((max, c) => Math.max(max, c.numero || 0), 0);
                        setNewCampanaNumber(String(maxNum + 1));
                        setShowNewCampanaModal(true);
                      }}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-3xs"
                    >
                      <span>Crear Campaña</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {campanasDisponibles.filter(campana => {
                    if (selectedCampanaYear === 'Todas') return true;
                    return String(campana.anio) === selectedCampanaYear;
                  }).sort((a, b) => a.numero - b.numero).map((campana) => {
                    const fullName = `${campana.nombre} ${campana.anio}`;
                    const loadedRefsCount = campanasReferencias[fullName]?.length || 0;
                    const isActive = activeCampana === fullName;

                    return (
                      <div
                        key={fullName}
                        className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                          isActive 
                            ? 'bg-indigo-50/50 border-indigo-200 shadow-xs' 
                            : 'bg-slate-50/50 border-slate-200'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-xs font-bold text-slate-800 line-clamp-1">{campana.nombre}</span>
                            {isActive && (
                              <span className="text-[8px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full font-bold uppercase shrink-0">Activa</span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-1.5 text-[10px] bg-white p-2 rounded-lg border border-slate-100 font-medium">
                            <div className="text-slate-400">Año: <span className="font-semibold text-slate-700">{campana.anio}</span></div>
                            <div className="text-slate-400 text-right">Orden: <span className="font-mono font-bold text-indigo-600">#{campana.numero}</span></div>
                          </div>

                          <p className="text-[10px] text-slate-400 font-semibold">{loadedRefsCount} referencias habilitadas</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCampanaConfig(fullName);
                            setCampanaRefSearch('');
                          }}
                          className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[10px] uppercase tracking-wider rounded-lg shadow-xs transition-all text-center"
                        >
                          Gestionar Referencias
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}
        </section>

        {/* Simple Atelier Footer */}
        <footer className="mt-12 pt-6 border-t border-slate-200 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-1">
          <p className="font-semibold text-slate-700">Arare S.A.S. - Sistema de toma de pedidos.</p>
        </footer>

      </div>

      {/* Plantillas de Ejemplo Modal */}
      {showTemplateModal && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setShowTemplateModal(false)}
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
                <p className="text-[11px] text-slate-500 mt-0.5">Descarga ejemplos oficiales de archivos para importar al taller.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5">
              <a 
                href="/plantillas/plantilla_referencias.xlsx" 
                download="plantilla_referencias.xlsx"
                className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 rounded-xl transition-all group text-left"
              >
                <div className="text-xs">
                  <span className="font-bold text-slate-800 block group-hover:text-indigo-700 transition-colors">Plantilla de Referencias</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Para importar catálogo general de prendas.</span>
                </div>
                <Download className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </a>

              <a 
                href="/plantillas/plantilla_clientes.xlsx" 
                download="plantilla_clientes.xlsx"
                className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 rounded-xl transition-all group text-left"
              >
                <div className="text-xs">
                  <span className="font-bold text-slate-800 block group-hover:text-indigo-700 transition-colors">Plantilla de Clientes</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Para cargar datos básicos de clientes y plazos.</span>
                </div>
                <Download className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </a>

              <a 
                href="/plantillas/plantilla_campana_mapeo.xlsx" 
                download="plantilla_campana_mapeo.xlsx"
                className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 rounded-xl transition-all group text-left"
              >
                <div className="text-xs">
                  <span className="font-bold text-slate-800 block group-hover:text-indigo-700 transition-colors">Plantilla de Mapeo de Campaña</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Para asociar referencias existentes a una campaña.</span>
                </div>
                <Download className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </a>
            </div>

            <button
              type="button"
              onClick={() => setShowTemplateModal(false)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors text-center"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Crear Nueva Campaña Modal */}
      {showNewCampanaModal && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setShowNewCampanaModal(false)}
        >
          <form 
            onSubmit={handleCreateCampana}
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
                onClick={() => setShowNewCampanaModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Nombre de la Campaña *</label>
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
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Año *</label>
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
                        // When year changes, auto calculate next order number
                        const maxNum = campanasDisponibles.reduce((max, c) => Math.max(max, c.numero || 0), 0);
                        setNewCampanaNumber(String(maxNum + 1));
                      }
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Número de Orden *</label>
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
                onClick={() => setShowNewCampanaModal(false)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors text-center"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-colors text-center"
              >
                Crear Campaña
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
