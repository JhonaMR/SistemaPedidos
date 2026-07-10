import { useState, FormEvent, MouseEvent, useEffect } from 'react';
import { Cliente, Pedido } from '../types';
import { Search, Phone, Mail, MapPin, UserPlus, FileText, ChevronRight, Edit2, CheckCircle, ChevronLeft } from 'lucide-react';

interface ClientSectionProps {
  clientes: Cliente[];
  pedidos: Pedido[];
  onAddCliente: (cliente: Omit<Cliente, 'id' | 'fechaRegistro'>) => void;
  onEditCliente: (cliente: Cliente) => void;
  initialEditingClient?: Cliente | null;
  onCancelEdit?: () => void;
}

export default function ClientSection({ 
  clientes, 
  pedidos, 
  onAddCliente, 
  onEditCliente,
  initialEditingClient,
  onCancelEdit
}: ClientSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Cliente | null>(null);

  // Pagination states for clients
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Form Fields
  const [codigoCliente, setCodigoCliente] = useState('');
  const [nombre, setNombre] = useState('');
  const [documentoIdentidad, setDocumentoIdentidad] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [direccion, setDireccion] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [notas, setNotas] = useState('');
  const [limiteFacturacion, setLimiteFacturacion] = useState('N/A');

  // Search filter - Only by Name or Client ID
  const filteredClientes = clientes.filter(c =>
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.codigoCliente || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Reset page when search or itemsPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  useEffect(() => {
    if (initialEditingClient) {
      setSelectedClientId(null);
      setEditingClient(initialEditingClient);
      setCodigoCliente(initialEditingClient.codigoCliente || '');
      setNombre(initialEditingClient.nombre);
      setDocumentoIdentidad(initialEditingClient.documentoIdentidad);
      setTelefono(initialEditingClient.telefono);
      setCorreo(initialEditingClient.correo);
      setDireccion(initialEditingClient.direccion);
      setCiudad(initialEditingClient.ciudad);
      setNotas(initialEditingClient.notas || '');
      setLimiteFacturacion(initialEditingClient.limiteFacturacion || 'N/A');
      setShowAddForm(true);
    }
  }, [initialEditingClient]);

  const totalPages = Math.ceil(filteredClientes.length / itemsPerPage);
  const paginatedClientes = filteredClientes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !documentoIdentidad.trim() || !telefono.trim() || !codigoCliente.trim()) return;

    let formattedCodigo = codigoCliente.trim();
    if (/^\d+$/.test(formattedCodigo)) {
      formattedCodigo = formattedCodigo.padStart(3, '0');
    }

    if (editingClient) {
      onEditCliente({
        ...editingClient,
        codigoCliente: formattedCodigo,
        nombre,
        documentoIdentidad,
        telefono,
        correo,
        direccion,
        ciudad,
        notas,
        limiteFacturacion
      });
      setEditingClient(null);
    } else {
      onAddCliente({
        codigoCliente: formattedCodigo,
        nombre,
        documentoIdentidad,
        telefono,
        correo,
        direccion,
        ciudad,
        notas,
        limiteFacturacion
      });
    }

    // Reset Form
    setCodigoCliente('');
    setNombre('');
    setDocumentoIdentidad('');
    setTelefono('');
    setCorreo('');
    setDireccion('');
    setCiudad('');
    setNotas('');
    setLimiteFacturacion('N/A');
    setShowAddForm(false);
  };

  const handleEditClick = (c: Cliente, e: MouseEvent) => {
    e.stopPropagation();
    setEditingClient(c);
    setCodigoCliente(c.codigoCliente || '');
    setNombre(c.nombre);
    setDocumentoIdentidad(c.documentoIdentidad);
    setTelefono(c.telefono);
    setCorreo(c.correo);
    setDireccion(c.direccion);
    setCiudad(c.ciudad);
    setNotas(c.notas || '');
    setLimiteFacturacion(c.limiteFacturacion || 'N/A');
    setShowAddForm(true);
  };

  const handleEditFromDetailedView = (c: Cliente, e: MouseEvent) => {
    e.stopPropagation();
    setSelectedClientId(null);
    setEditingClient(c);
    setCodigoCliente(c.codigoCliente || '');
    setNombre(c.nombre);
    setDocumentoIdentidad(c.documentoIdentidad);
    setTelefono(c.telefono);
    setCorreo(c.correo);
    setDireccion(c.direccion);
    setCiudad(c.ciudad);
    setNotas(c.notas || '');
    setLimiteFacturacion(c.limiteFacturacion || 'N/A');
    setShowAddForm(true);
  };

  const selectedCliente = clientes.find(c => c.id === selectedClientId);
  const clientOrders = selectedClientId ? pedidos.filter(p => p.clienteId === selectedClientId) : [];
  const totalSpentByClient = clientOrders
    .filter(p => p.estado !== 'Cancelado')
    .reduce((sum, p) => sum + p.total, 0);

  // Formatting helpers
  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(val);
  };

  return (
    <div id="client-section-layout" className="w-full">
      {!selectedClientId ? (
        /* Left side (Now main): Client search and List */
        <div id="client-list-column" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#1E293B] uppercase tracking-wider">Base de datos de Clientes</h3>
            <button
              id="btn-toggle-add-client"
              onClick={() => {
                setEditingClient(null);
                setCodigoCliente('');
                setNombre('');
                setDocumentoIdentidad('');
                setTelefono('');
                setCorreo('');
                setDireccion('');
                setCiudad('');
                setNotas('');
                setShowAddForm(!showAddForm);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4A5D4E] hover:bg-[#3D4C3F] text-white text-xs font-bold rounded-lg transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              <span>Nuevo Cliente</span>
            </button>
          </div>

          {/* Search bar */}
          <div id="search-client-container" className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8C877D]" />
            <input
              id="search-client-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o ID de cliente..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#2C2A29] focus:outline-none focus:ring-1 focus:ring-[#4A5D4E]"
            />
          </div>

          {/* Form Container (Slide down style) */}
          {showAddForm && (
            <div id="add-client-form-container" className="bg-[#FAF9F5] border border-[#E9E4D4] rounded-xl p-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#4A5D4E]">
                {editingClient ? 'Modificar Datos de Cliente' : 'Registrar Nuevo Cliente'}
              </h4>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-0.5">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. María Camila Restrepo"
                    className="w-full p-2 bg-white border border-[#E2E8F0] rounded-md text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-0.5">ID Cliente (3 dígitos) *</label>
                    <input
                      type="text"
                      required
                      value={codigoCliente}
                      onChange={(e) => setCodigoCliente(e.target.value)}
                      placeholder="Ej. 001"
                      className="w-full p-2 bg-white border border-[#E2E8F0] rounded-md text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-0.5">Identificación / NIT *</label>
                    <input
                      type="text"
                      required
                      value={documentoIdentidad}
                      onChange={(e) => setDocumentoIdentidad(e.target.value)}
                      placeholder="Ej. DNI 10239485 o NIT"
                      className="w-full p-2 bg-white border border-[#E2E8F0] rounded-md text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-0.5">Teléfono *</label>
                    <input
                      type="text"
                      required
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="Ej. 312 456 7890 o N/A"
                      className="w-full p-2 bg-white border border-[#E2E8F0] rounded-md text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-0.5">Correo Electrónico</label>
                  <input
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="ejemplo@correo.com"
                    className="w-full p-2 bg-white border border-[#E2E8F0] rounded-md text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-0.5">Dirección</label>
                    <input
                      type="text"
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      placeholder="Calle 45 # 12-34"
                      className="w-full p-2 bg-white border border-[#E2E8F0] rounded-md text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-0.5">Ciudad</label>
                    <input
                      type="text"
                      value={ciudad}
                      onChange={(e) => setCiudad(e.target.value)}
                      placeholder="Medellín"
                      className="w-full p-2 bg-white border border-[#E2E8F0] rounded-md text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-0.5">Preferencias de cliente</label>
                  <textarea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Ej. Prefiere pantalones de bota recta, talla S en camisas."
                    rows={2}
                    className="w-full p-2 bg-white border border-[#E2E8F0] rounded-md text-xs resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">Límite de fecha de facturación</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setLimiteFacturacion('N/A')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${limiteFacturacion === 'N/A'
                          ? 'bg-[#1E293B] text-white border-[#1E293B]'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                      N/A
                    </button>
                    <div className="flex items-center gap-1.5 flex-1">
                      <input
                        type="number"
                        min="1"
                        max="31"
                        placeholder="Día del mes (1-31)"
                        value={limiteFacturacion !== 'N/A' ? limiteFacturacion : ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setLimiteFacturacion('N/A');
                          } else {
                            const num = Math.max(1, Math.min(31, parseInt(val) || 1));
                            setLimiteFacturacion(num.toString());
                          }
                        }}
                        className="p-1.5 bg-white border border-[#E2E8F0] rounded-md text-xs w-full"
                      />
                      <span className="text-[10px] text-slate-400 font-semibold shrink-0">Día del mes</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingClient(null);
                      if (onCancelEdit) onCancelEdit();
                    }}
                    className="px-3 py-1.5 bg-[#E2E8F0] text-[#475569] text-xs font-bold rounded-md"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-[#4A5D4E] text-white text-xs font-bold rounded-md flex items-center gap-1"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>{editingClient ? 'Guardar Cambios' : 'Registrar'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Client List */}
          <div id="clients-list-stack" className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {paginatedClientes.length === 0 ? (
              <div className="text-center p-8 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#64748B]">
                No se encontraron clientes registrados con esos criterios.
              </div>
            ) : (
              paginatedClientes.map((c) => {
                const totalVal = pedidos.filter(p => p.clienteId === c.id && p.estado !== 'Cancelado').reduce((sum, p) => sum + p.total, 0);

                return (
                  <div
                    id={`client-card-${c.id}`}
                    key={c.id}
                    onClick={() => setSelectedClientId(c.id)}
                    className="p-4 border border-[#E2E8F0] bg-white hover:border-[#CBD5E1] rounded-xl cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <h4 className="text-sm font-bold text-[#1E293B] truncate flex flex-wrap items-center gap-1.5">
                        <span>{c.nombre}</span>
                        <span className="font-mono text-xs font-extrabold bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                          {c.codigoCliente === '000' || c.id.startsWith('cli_off_') ? '000' : c.codigoCliente}
                        </span>
                        {(c.codigoCliente === '000' || c.id.startsWith('cli_off_')) && (
                          <span className="inline-block px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[9px] font-bold">Pendiente ID</span>
                        )}
                      </h4>
                      <p className="text-[10px] font-semibold text-[#64748B] mt-0.5">{c.documentoIdentidad}</p>
                      <p className="text-[11px] text-[#475569] mt-0.5 flex items-center gap-1.5 truncate" title={c.direccion}>
                        <span className="text-[10px] font-semibold text-[#64748B] shrink-0">{c.ciudad}</span>
                        {c.direccion && (
                          <>
                            <span className="text-slate-300">•</span>
                            <MapPin className="h-3 w-3 shrink-0 text-[#8C877D]" />
                            <span className="truncate">{c.direccion}</span>
                          </>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] uppercase tracking-wider text-[#94A3B8] block">Cant. pedidos</span>
                        <span className="text-sm font-black text-[#4A5D4E] font-mono block">
                          {pedidos.filter(p => p.clienteId === c.id).length}
                        </span>
                      </div>
                      <button
                        id={`btn-edit-client-${c.id}`}
                        onClick={(e) => handleEditClick(c, e)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-50 transition-colors"
                        title="Editar cliente"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <ChevronRight className="h-4 w-4 text-[#94A3B8]" />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Controls */}
          {filteredClientes.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 mt-4">
              <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Mostrar:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#4A5D4E] cursor-pointer shadow-3xs hover:border-slate-300 transition-colors"
                  >
                    <option value={5}>5 por pág.</option>
                    <option value={10}>10 por pág.</option>
                    <option value={20}>20 por pág.</option>
                    <option value={50}>50 por pág.</option>
                  </select>
                </div>
                <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
                <span className="text-[11px] text-slate-400">
                  Total: <span className="font-bold text-slate-700">{filteredClientes.length}</span> registros
                </span>
              </div>

              <div className="flex items-center justify-center gap-2 self-center sm:self-auto bg-white border border-slate-200/60 rounded-lg p-1 shadow-3xs">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="p-1 px-2.5 bg-transparent hover:bg-slate-50 text-slate-600 disabled:text-slate-300 font-bold rounded-md disabled:pointer-events-none transition-all flex items-center gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span className="text-[10px] uppercase tracking-wider hidden xs:inline">Anterior</span>
                </button>
                <div className="h-4 w-px bg-slate-100"></div>
                <span className="px-3 text-[11px] font-bold text-slate-700 min-w-[70px] text-center">
                  Pág. {currentPage} / {Math.max(1, totalPages)}
                </span>
                <div className="h-4 w-px bg-slate-100"></div>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="p-1 px-2.5 bg-transparent hover:bg-slate-50 text-slate-600 disabled:text-slate-300 font-bold rounded-md disabled:pointer-events-none transition-all flex items-center gap-1"
                >
                  <span className="text-[10px] uppercase tracking-wider hidden xs:inline">Siguiente</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Right side (now replaces left side): Client detailed records */
        selectedCliente && (
          <div id="selected-client-dashboard" className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-6 shadow-sm">

            {/* Clickable Header: Profile Card */}
            <div
              onClick={() => setSelectedClientId(null)}
              className="flex items-center justify-between border-b border-[#F1F5F9] pb-4 cursor-pointer hover:bg-slate-50 -mx-4 -mt-4 p-4 rounded-t-xl transition-all group"
              title="Haz clic para volver a la lista"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-600 group-hover:bg-[#FAF7F0] group-hover:text-[#4A5D4E] transition-colors">
                  <ChevronRight className="h-5 w-5 transform rotate-180" />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-[#858074] block">Ficha de Cliente • Clic para volver</span>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold font-serif text-[#1E293B] mt-0.5 group-hover:text-[#4A5D4E] transition-colors">{selectedCliente.nombre}</h3>
                    <button
                      type="button"
                      onClick={(e) => handleEditFromDetailedView(selectedCliente, e)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      title="Editar Datos de Cliente"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-[#64748B] mt-1">Registrado el {selectedCliente.fechaRegistro}</p>
                </div>
              </div>

              <div
                className="bg-[#FAF7F0] p-3 rounded-lg border border-[#EDECE3] text-center min-w-[120px]"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-[9px] uppercase font-bold tracking-widest text-[#858074] block">Pedidos Realizados</span>
                <span className="text-2xl font-black text-[#4A5D4E] font-mono block mt-0.5">{clientOrders.length}</span>
                <span className="text-[9px] text-[#64748B] block">pedido(s)</span>
              </div>
            </div>

            {/* Profile Grid Contacts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-[#94A3B8] block">ID Cliente</span>
                    <span className="font-semibold text-slate-700 font-mono">{selectedCliente.codigoCliente}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-[#94A3B8] block">Identificación / NIT</span>
                    <span className="font-semibold text-slate-700">{selectedCliente.documentoIdentidad}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-[#94A3B8] block">Celular de Contacto</span>
                    <span className="font-semibold text-slate-700">{selectedCliente.telefono}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-[#94A3B8] block">Correo Electrónico</span>
                    <span className="font-semibold text-slate-700">{selectedCliente.correo || 'No registrado'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-[#94A3B8] block">Dirección de Despacho</span>
                    <span className="font-semibold text-slate-700">{selectedCliente.direccion || 'No especificada'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-[#94A3B8] block">Ciudad</span>
                    <span className="font-semibold text-slate-700">{selectedCliente.ciudad}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-[#94A3B8] block">Límite de fecha de facturación</span>
                    <span className="font-semibold text-rose-600">{selectedCliente.limiteFacturacion || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Client Notes & Sizing Preferences */}
            {selectedCliente.notas && (
              <div className="bg-[#FAF9F5] border border-[#ECE7DF] p-4 rounded-xl">
                <h4 className="text-[10px] uppercase font-bold tracking-widest text-[#7C756B] mb-1">Preferencias de cliente</h4>
                <p className="text-xs text-[#5C5549] leading-relaxed">{selectedCliente.notas}</p>
              </div>
            )}

            {/* Client Order History Checklist */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E293B]">Historial de Pedidos de {selectedCliente.nombre}</h4>

              {clientOrders.length === 0 ? (
                <div className="text-center p-6 border border-dashed border-slate-200 rounded-lg text-xs text-[#64748B]">
                  Este cliente aún no registra ningún pedido de prendas.
                </div>
              ) : (
                <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {clientOrders.map((o) => {
                    let stBadge = 'bg-amber-100 text-amber-800';
                    if (o.estado === 'Procesado') stBadge = 'bg-blue-100 text-blue-800';
                    if (o.estado === 'Activo') stBadge = 'bg-purple-100 text-purple-800';
                    if (o.estado === 'Completo') stBadge = 'bg-emerald-100 text-emerald-800';
                    if (o.estado === 'Cancelado') stBadge = 'bg-rose-100 text-rose-800';

                    const refsCount = new Set(o.items.map(item => item.prendaRef)).size;
                    const totalUnits = o.items.reduce((sum, item) => sum + item.cantidad, 0);
                    const campaignName = o.campana || 'Campaña General';

                    return (
                      <div key={o.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-[#FAF9F6] transition-colors">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-700">{o.numeroPedido}</span>
                            <span className="text-[#94A3B8]">•</span>
                            <span className="text-slate-500">{o.fecha}</span>
                          </div>
                          <p className="text-[11px] text-[#64748B] mt-0.5">
                            Referencias: {refsCount} • Unidades totales: {totalUnits} • Campaña: {campaignName}
                          </p>
                        </div>

                        <div className="text-right flex items-center gap-3">
                          <div>
                            <span className="font-bold text-slate-800 block">{formatCOP(o.total)}</span>
                          </div>
                          <span className={`px-2 py-0.5 font-bold text-[9px] uppercase tracking-wider rounded-md ${stBadge}`}>
                            {o.estado}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )
      )}
    </div>
  );
}
