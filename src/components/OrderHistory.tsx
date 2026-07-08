import { useState, useEffect } from 'react';
import { Pedido, ItemPedido, Cliente, Prenda } from '../types';
import { printOrderReceipt } from '../services/printService';
import { 
  Search, 
  Filter, 
  Printer, 
  ChevronDown, 
  ChevronUp, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Truck, 
  Scissors, 
  FileText,
  Copy,
  X,
  User,
  Trash2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Package,
  AlertTriangle
} from 'lucide-react';

interface OrderHistoryProps {
  pedidos: Pedido[];
  clientes: Cliente[];
  catalogGarments?: Prenda[];
  onUpdateStatus: (orderId: string, status: Pedido['estado'], fechaCancelado?: string) => void;
  onDuplicatePedido: (pedido: Pedido, targetClienteId: string) => void;
  currentUser?: { rol: 'general' | 'soporte' } | null;
  deletedPedidos?: Pedido[];
  onDeletePedido?: (orderId: string) => void;
  onRestorePedido?: (orderId: string) => void;
  onPermanentDelete?: (orderId: string) => void;
  onEditPedido?: (pedido: Pedido) => void;
  backups?: Pedido[];
  onEmptyTrash?: () => void;
}

export default function OrderHistory({ 
  pedidos, 
  clientes, 
  catalogGarments = [],
  onUpdateStatus, 
  onDuplicatePedido,
  currentUser,
  deletedPedidos = [],
  onDeletePedido,
  onRestorePedido,
  onPermanentDelete,
  onEditPedido,
  backups = [],
  onEmptyTrash
}: OrderHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [vendedorFilter, setVendedorFilter] = useState<string>('Todos');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [showDeletedOnly, setShowDeletedOnly] = useState(false);
  const [showBackupsOnly, setShowBackupsOnly] = useState(false);

  // Pagination states for order history
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Duplication Modal State
  const [duplicatingPedido, setDuplicatingPedido] = useState<Pedido | null>(null);
  const [targetClienteId, setTargetClienteId] = useState<string>('');
  const [clientSearch, setClientSearch] = useState<string>('');

  // Custom dialog/modal states
  const [cancelModalPedido, setCancelModalPedido] = useState<Pedido | null>(null);
  const [cancelDate, setCancelDate] = useState('');
  const [deleteConfirmPedido, setDeleteConfirmPedido] = useState<Pedido | null>(null);
  const [permDeleteConfirmPedido, setPermDeleteConfirmPedido] = useState<Pedido | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);
  };

  const activePedidosList = showBackupsOnly 
    ? backups 
    : (showDeletedOnly ? deletedPedidos : pedidos);

  // Filter logic
  const filteredOrders = activePedidosList.filter(p => {
    const matchesSearch = 
      p.clienteNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.clienteId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'Todos' || p.estado === statusFilter;
    const matchesVendedor = vendedorFilter === 'Todos' || p.vendedorNombre === vendedorFilter;

    return matchesSearch && matchesStatus && matchesVendedor;
  });

  // Reset page when filtering or items per page change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, vendedorFilter, showDeletedOnly, showBackupsOnly, itemsPerPage]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Formatting helpers
  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(val);
  };

  const handlePrint = (order: Pedido) => {
    printOrderReceipt(order, clientes, catalogGarments);
  };

  return (
    <div id="order-history-container" className="space-y-6">
      
      {/* Search and Filters row */}
      <div id="history-filter-bar" className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4 justify-between shadow-sm">
        
        {/* Search Input */}
        <div id="search-history-wrapper" className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8C877D]" />
          <input
            id="search-history-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente o ID de cliente..."
            className="w-full pl-9 pr-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm text-[#2C2A29] focus:outline-none focus:ring-1 focus:ring-[#4A5D4E]"
          />
        </div>

        {/* Support Only: Seller Filter */}
        {currentUser?.rol === 'soporte' && (
          <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-1.5 px-3 shrink-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#64748B]">Vendedor:</span>
            <select
              value={vendedorFilter}
              onChange={(e) => setVendedorFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="Todos">Todos</option>
              {Array.from(new Set(activePedidosList.map(p => p.vendedorNombre))).filter(Boolean).sort().map(vend => (
                <option key={vend} value={vend}>{vend}</option>
              ))}
            </select>
          </div>
        )}

        {/* Status filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex flex-wrap gap-1">
              {['Todos', 'Pendiente', 'Procesado', 'Activo', 'Completo', 'Cancelado'].map((status) => {
                return (
                  <button
                    id={`btn-filter-status-${status}`}
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`py-1 px-2.5 text-xs font-semibold rounded-md transition-all ${
                      statusFilter === status
                        ? 'bg-[#1E293B] text-white'
                        : 'bg-[#F1F5F9] text-[#475569] hover:bg-slate-200'
                    }`}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toggle Cambios Button */}
          <button
            id="btn-toggle-backups"
            type="button"
            onClick={() => {
              const newVal = !showBackupsOnly;
              setShowBackupsOnly(newVal);
              if (newVal) {
                setShowDeletedOnly(false);
              }
              setStatusFilter('Todos');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all shrink-0 ${
              showBackupsOnly
                ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                : 'bg-white border-amber-200 text-amber-600 hover:bg-amber-50 shadow-xs'
            }`}
            title={showBackupsOnly ? "Ver Pedidos Activos" : "Ver Cambios / Historial de versiones"}
          >
            <RotateCcw className="h-4 w-4" />
            <span>{showBackupsOnly ? "Ver Activos" : `Cambios (${backups.length})`}</span>
          </button>

          {/* Toggle Trash Button */}
          <button
            id="btn-toggle-trash"
            type="button"
            onClick={() => {
              const newVal = !showDeletedOnly;
              setShowDeletedOnly(newVal);
              if (newVal) {
                setShowBackupsOnly(false);
              }
              setStatusFilter('Todos');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all shrink-0 ${
              showDeletedOnly
                ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                : 'bg-white border-slate-200 text-rose-600 hover:bg-rose-50 shadow-xs'
            }`}
            title={showDeletedOnly ? "Ver Pedidos Activos" : "Ver Papelera de Pedidos"}
          >
            <Trash2 className="h-4 w-4" />
            <span>{showDeletedOnly ? "Ver Activos" : `Papelera (${deletedPedidos.length})`}</span>
          </button>

          {/* Empty Trash Button for Soporte */}
          {showDeletedOnly && currentUser?.rol === 'soporte' && deletedPedidos.length > 0 && (
            <button
              id="btn-empty-trash"
              type="button"
              onClick={() => {
                if (confirm('¿Estás seguro de que deseas vaciar la papelera por completo? Esta acción eliminará permanentemente todos los pedidos en ella y es irreversible.')) {
                  onEmptyTrash?.();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-700 border border-rose-700 text-white hover:bg-rose-800 transition-all shrink-0 shadow-sm"
              title="Vaciar Papelera de Pedidos"
            >
              <Trash2 className="h-4 w-4" />
              <span>Vaciar Papelera</span>
            </button>
          )}
        </div>
      </div>

      {/* Orders List Container */}
      <div id="orders-history-list" className="space-y-3">
        {paginatedOrders.length === 0 ? (
          <div className="text-center p-12 bg-white border border-[#E2E8F0] rounded-2xl text-xs text-[#64748B]">
            No se encontraron pedidos de prendas con los filtros aplicados.
          </div>
        ) : (
          paginatedOrders.map((pedido) => {
            const isExpanded = expandedOrderId === pedido.id;
            
            // Logistical state badges
            let stBadge = 'bg-amber-50 text-amber-800 border-amber-200';
            let stIcon = <Clock className="h-4 w-4 text-amber-600" />;
            
            if (pedido.estado === 'Procesado') { 
              stBadge = 'bg-blue-50 text-blue-800 border-blue-200'; 
              stIcon = <Package className="h-4 w-4 text-blue-600" />; 
            } else if (pedido.estado === 'Activo') { 
              stBadge = 'bg-purple-50 text-purple-800 border-purple-200'; 
              stIcon = <Truck className="h-4 w-4 text-purple-600" />; 
            } else if (pedido.estado === 'Completo') { 
              stBadge = 'bg-emerald-50 text-emerald-800 border-emerald-200'; 
              stIcon = <CheckCircle className="h-4 w-4 text-emerald-600" />; 
            } else if (pedido.estado === 'Cancelado') { 
              stBadge = 'bg-rose-50 text-rose-800 border-rose-200'; 
              stIcon = <AlertTriangle className="h-4 w-4 text-rose-600" />; 
            }

            if (pedido.esBackup) {
              stBadge = 'bg-amber-100 text-amber-900 border-amber-300';
              stIcon = <RotateCcw className="h-4 w-4 text-amber-700" />;
            }

            return (
              <div 
                id={`order-block-${pedido.id}`}
                key={pedido.id}
                className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden transition-all shadow-sm hover:shadow-md"
              >
                {/* Header Row */}
                <div 
                  id={`order-header-${pedido.id}`}
                  onClick={() => setExpandedOrderId(isExpanded ? null : pedido.id)}
                  className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-[#FAF9F6] transition-colors"
                >
                  <div className="flex items-start md:items-center gap-3">
                    <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                      <FileText className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-slate-800">{pedido.numeroPedido}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs font-bold text-slate-700">{pedido.clienteNombre}</span>
                        {(() => {
                          const fe = pedido.facturacionFE !== undefined ? pedido.facturacionFE : 100;
                          const rm = pedido.facturacionRM !== undefined ? pedido.facturacionRM : 0;
                          const isDivided = fe !== 100 || rm !== 0;
                          return (
                            <span 
                              className={`px-1.5 py-0.5 text-[9px] rounded-md font-black font-mono flex items-center gap-0.5 shadow-3xs border ${
                                isDivided 
                                  ? 'bg-amber-50 border-amber-200 text-amber-800' 
                                  : 'bg-slate-100 border-slate-200 text-slate-700'
                              }`} 
                              title={`Facturación: FE ${fe}% / RM ${rm}%`}
                            >
                              <span>{fe}</span>
                              <span className={isDivided ? 'text-amber-300' : 'text-slate-300'}>/</span>
                              <span>{rm}</span>
                            </span>
                          );
                        })()}
                        {pedido.editado && (
                          <span className="px-1.5 py-0.5 text-[8px] bg-amber-100 border border-amber-300 text-amber-800 rounded font-black uppercase tracking-wider animate-pulse">
                            Editado
                          </span>
                        )}
                        {pedido.esBackup && (
                          <span className="px-1.5 py-0.5 text-[8px] bg-blue-100 border border-blue-300 text-blue-800 rounded font-black uppercase tracking-wider">
                            Versión Anterior ({pedido.backupFecha})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                        <span>Registrado: {pedido.fecha}</span>
                        <span>•</span>
                        <span>Inicio desp.: {pedido.fechaEntregaEstimada}</span>
                        <span>•</span>
                        <span>Fin desp.: {pedido.fechaLimiteDespacho || 'N/A'}</span>
                        {pedido.estado === 'Cancelado' && pedido.fechaCancelado && (
                          <>
                            <span>•</span>
                            <span className="text-rose-600 font-bold">Cancelado: {pedido.fechaCancelado}</span>
                          </>
                        )}
                        {pedido.fechaEliminacion && (
                          <>
                            <span>•</span>
                            <span className="text-rose-600 font-bold">Eliminado: {pedido.fechaEliminacion}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-2.5 md:pt-0 flex-wrap">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">Referencias</span>
                      <span className="text-sm font-black text-[#1E293B] font-mono">
                        {new Set(pedido.items.map(item => item.prendaRef)).size} ref.
                      </span>
                    </div>

                    <div className="text-left md:text-right">
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">Total Unidades</span>
                      <span className="text-sm font-black text-[#1E293B] font-mono">
                        {pedido.items.reduce((sum, item) => sum + item.cantidad, 0)} u.
                      </span>
                    </div>

                    <div className="text-left md:text-right">
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">Valor Pedido</span>
                      <span className="text-sm font-black text-[#1E293B]">{formatCOP(pedido.total)}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 border font-bold text-[9px] uppercase tracking-wider rounded-lg flex items-center gap-1.5 ${stBadge}`}>
                        {stIcon}
                        <span>{pedido.estado}</span>
                      </span>

                      {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </div>
                  </div>
                </div>

                {/* Expanded details container */}
                {isExpanded && (
                  <div id={`order-body-${pedido.id}`} className="px-5 pb-5 border-t border-slate-100 bg-[#FCFDFD] space-y-5 pt-4">
                    
                    {/* Status updater and action bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#ECEFF1] p-3.5 rounded-xl">
                      <div className="flex items-center gap-2">
                        {pedido.esBackup ? (
                          <div className="flex items-center gap-1.5 text-xs text-amber-600 font-bold uppercase tracking-wider">
                            <RotateCcw className="h-4 w-4" />
                            <span>Versión de Respaldo</span>
                          </div>
                        ) : showDeletedOnly ? (
                          <div className="flex items-center gap-1.5 text-xs text-rose-600 font-bold uppercase tracking-wider">
                            <Trash2 className="h-4 w-4" />
                            <span>Pedido Eliminado</span>
                          </div>
                        ) : (
                          <>
                            <span className="text-xs font-bold text-slate-600 uppercase">Cambiar Estado Logístico:</span>
                            <select
                              id={`select-status-update-${pedido.id}`}
                              value={pedido.estado}
                              onChange={(e) => {
                                const newStatus = e.target.value as any;
                                if (newStatus === 'Cancelado') {
                                  const today = new Date().toISOString().split('T')[0];
                                  setCancelDate(today);
                                  setCancelModalPedido(pedido);
                                } else {
                                  onUpdateStatus(pedido.id, newStatus);
                                  showFeedback(`Estado de pedido actualizado a ${newStatus}.`);
                                }
                              }}
                              className="p-1.5 border border-slate-200 rounded text-xs bg-white text-slate-700 font-semibold focus:outline-none cursor-pointer hover:border-slate-300 transition-colors"
                            >
                              <option value="Pendiente">Pendiente</option>
                              <option value="Procesado">Procesado</option>
                              <option value="Activo">Activo</option>
                              <option value="Completo">Completo</option>
                              <option value="Cancelado">Cancelado</option>
                            </select>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {pedido.esBackup ? (
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                            Archivo Histórico Inmutable
                          </span>
                        ) : showDeletedOnly ? (
                          <>
                            {onRestorePedido && (
                              <button
                                id={`btn-restore-order-${pedido.id}`}
                                onClick={() => {
                                  onRestorePedido(pedido.id);
                                  showFeedback('Pedido restaurado con éxito.');
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4A5D4E] hover:bg-[#3C4D3F] border border-[#4A5D4E] text-white text-xs font-bold rounded-lg transition-colors"
                                title="Restaurar Pedido"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span>Restaurar</span>
                              </button>
                            )}
                            {onPermanentDelete && (
                              <button
                                id={`btn-permanent-delete-order-${pedido.id}`}
                                onClick={() => {
                                  setPermDeleteConfirmPedido(pedido);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors"
                                title="Eliminar Permanentemente"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Eliminar Definitivamente</span>
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            {/* Edit button: for everyone so they can easily edit */}
                            {onEditPedido && (
                              <button
                                id={`btn-edit-order-${pedido.id}`}
                                onClick={() => onEditPedido(pedido)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-xs font-bold rounded-lg transition-colors"
                                title="Editar Pedido"
                              >
                                <Scissors className="h-3.5 w-3.5" />
                                <span>Editar</span>
                              </button>
                            )}

                            {/* Delete button: for general and soporte */}
                            {onDeletePedido && (
                              <button
                                id={`btn-delete-order-${pedido.id}`}
                                onClick={() => {
                                  setDeleteConfirmPedido(pedido);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold rounded-lg transition-colors"
                                title="Eliminar Pedido"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Eliminar</span>
                              </button>
                            )}

                            <button
                              id={`btn-duplicate-order-${pedido.id}`}
                              onClick={() => {
                                  setDuplicatingPedido(pedido);
                                  setTargetClienteId('');
                                  setClientSearch('');
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition-colors"
                              title="Volver a pedir"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              <span>Duplicar Pedido</span>
                            </button>
                          </>
                        )}

                        <button
                          id={`btn-print-order-${pedido.id}`}
                          onClick={() => handlePrint(pedido)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF7F0] border border-[#CBD5E1] hover:bg-[#F3EFE4] text-xs font-bold rounded-lg transition-colors"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>Imprimir Comprobante</span>
                        </button>
                      </div>
                    </div>

                    {/* Receipt Itemized Table */}
                    <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                            <th className="p-3">Prenda de Vestir</th>
                            <th className="p-3 text-center">Talla</th>
                            <th className="p-3 text-center">Requerimiento / Novedad</th>
                            <th className="p-3 text-center">Cant.</th>
                            <th className="p-3 text-right">Precio Un.</th>
                            <th className="p-3 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {pedido.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-3">
                                <span className="font-semibold text-slate-800 font-mono">
                                  {catalogGarments.find(g => g.ref === item.prendaRef)?.ref || item.prendaRef}
                                </span>
                                <span className="text-[10px] text-slate-400 block">{item.categoria}</span>
                              </td>
                              <td className="p-3 text-center font-bold text-slate-700">{item.talla.replace(/\s*\((\d+)\)/g, '-$1')}</td>
                              <td className="p-3 text-center">
                                {item.novedad ? (
                                  <span className="inline-block px-2 py-1 bg-amber-50 border border-amber-100 rounded text-[10px] text-amber-800 font-medium italic">
                                    {item.novedad}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">-</span>
                                )}
                              </td>
                              <td className="p-3 text-center font-bold text-slate-800">{item.cantidad}</td>
                              <td className="p-3 text-right font-mono text-slate-600">{formatCOP(item.precioUnitario)}</td>
                              <td className="p-3 text-right font-mono font-bold text-slate-800">{formatCOP(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Metadata summary columns */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                      
                      {/* Left: Notes & specifics */}
                      <div className="md:col-span-8 bg-white border border-slate-100 p-4 rounded-xl text-xs space-y-3.5">
                        {pedido.notas && (
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-widest text-[#858074] block mb-1">Notas de Producción / Medidas</span>
                            <p className="text-slate-600 italic bg-[#FAF9F5] p-3 border border-[#E9E4D4] rounded-lg">"{pedido.notas}"</p>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-0.5">Vendedor</span>
                            <span className="font-semibold text-slate-700">{pedido.vendedorNombre}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-0.5">% fact.</span>
                            <span className="font-mono font-extrabold text-slate-700">
                              FE: {pedido.facturacionFE !== undefined ? pedido.facturacionFE : 100}% / RM: {pedido.facturacionRM !== undefined ? pedido.facturacionRM : 0}%
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-0.5">Inicio desp.</span>
                            <span className="font-bold text-slate-700">{pedido.fechaEntregaEstimada}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-0.5">Fin desp.</span>
                            <span className="font-bold text-rose-600">{pedido.fechaLimiteDespacho || 'No asignada'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: financial details */}
                      <div className="md:col-span-4 bg-white border border-slate-100 p-4 rounded-xl text-xs space-y-2 flex flex-col justify-center">
                        {pedido.porcentajeDescuento > 0 && (
                          <div className="flex justify-between text-amber-700 font-semibold">
                            <span>Descuento ({pedido.porcentajeDescuento}%):</span>
                            <span className="font-mono">-{formatCOP(pedido.montoDescuento)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-800 font-extrabold text-sm">
                          <span>Monto Total:</span>
                          <span className="font-mono">{formatCOP(pedido.total)}</span>
                        </div>
                      </div>

                    </div>

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {filteredOrders.length > 0 && (
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
              Total: <span className="font-bold text-slate-700">{filteredOrders.length}</span> pedidos
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

      {/* Duplication Client Selection Modal */}
      {duplicatingPedido && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setDuplicatingPedido(null)}
        >
          <div 
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#4A5D4E] p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Copy className="h-5 w-5" />
                <div>
                  <h3 className="font-bold text-sm">Duplicar Pedido {duplicatingPedido.numeroPedido}</h3>
                  <p className="text-[10px] text-emerald-100">Selecciona el cliente destino para este nuevo pedido</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setDuplicatingPedido(null)}
                className="p-1 hover:bg-white/10 rounded-full transition-colors text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Search Client input */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar cliente por nombre o documento..."
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                  }}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#4A5D4E]"
                />
              </div>

              {/* Suggestions / List of clients */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {clientes.filter(c => {
                  const query = clientSearch.trim().toLowerCase();
                  if (!query) return true;
                  return (
                    c.nombre.toLowerCase().includes(query) ||
                    c.documentoIdentidad.includes(query)
                  );
                }).map((c) => {
                  const isSelected = targetClienteId === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setTargetClienteId(c.id)}
                      className={`p-3 border rounded-xl cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/70 ring-1 ring-indigo-500'
                          : 'border-slate-100 bg-slate-50/50 hover:bg-slate-100/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-white border border-slate-100 rounded-md">
                          <User className="h-4 w-4 text-slate-500" />
                        </div>
                        <div>
                          <span className="font-bold text-xs text-slate-800 block">{c.nombre}</span>
                          <span className="text-[10px] text-slate-400">CC/NIT: {c.documentoIdentidad} • Tel: {c.telefono}</span>
                        </div>
                      </div>
                      <div className={`h-4 w-4 rounded-full border flex items-center justify-center transition-all ${
                        isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDuplicatingPedido(null)}
                className="px-4 py-1.5 border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold rounded-lg text-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!targetClienteId}
                onClick={() => {
                  if (targetClienteId) {
                    onDuplicatePedido(duplicatingPedido, targetClienteId);
                    setDuplicatingPedido(null);
                  }
                }}
                className={`px-4 py-1.5 text-white text-xs font-bold rounded-lg transition-colors shadow-xs ${
                  targetClienteId
                    ? 'bg-[#4A5D4E] hover:bg-[#3D4C3F]'
                    : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                Duplicar Ahora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Cancel Date Modal */}
      {cancelModalPedido && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative space-y-4 animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-slate-950 uppercase tracking-wide">Confirmar Cancelación</h4>
              <p className="text-xs text-slate-500">
                Por favor, ingresa la fecha de cancelación para el pedido <strong>{cancelModalPedido.numeroPedido}</strong>:
              </p>
            </div>
            <div>
              <input
                type="date"
                value={cancelDate}
                onChange={(e) => setCancelDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const selectEl = document.getElementById(`select-status-update-${cancelModalPedido.id}`) as HTMLSelectElement;
                  if (selectEl) selectEl.value = cancelModalPedido.estado;
                  setCancelModalPedido(null);
                }}
                className="px-3 py-2 border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold rounded-lg text-slate-600 transition-colors"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateStatus(cancelModalPedido.id, 'Cancelado', cancelDate);
                  setCancelModalPedido(null);
                  showFeedback('Pedido cancelado correctamente.');
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
              >
                Confirmar Cancelación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Move to Trash Confirmation Modal */}
      {deleteConfirmPedido && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative space-y-4 animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-slate-950 uppercase tracking-wide">Mover a la Papelera</h4>
              <p className="text-xs text-slate-500">
                ¿Estás seguro de que deseas eliminar el pedido <strong>{deleteConfirmPedido.numeroPedido}</strong>? Se guardará en la papelera y podrás restaurarlo después.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmPedido(null)}
                className="px-3 py-2 border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold rounded-lg text-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeletePedido) {
                    onDeletePedido(deleteConfirmPedido.id);
                  }
                  setDeleteConfirmPedido(null);
                  showFeedback('Pedido movido a la papelera.');
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
              >
                Mover a Papelera
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Permanent Delete Confirmation Modal */}
      {permDeleteConfirmPedido && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative space-y-4 animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-slate-950 uppercase text-rose-600 tracking-wide">Eliminar Definitivamente</h4>
              <p className="text-xs text-slate-500">
                ¿Estás seguro de que deseas eliminar permanentemente el pedido <strong>{permDeleteConfirmPedido.numeroPedido}</strong>? Esta acción es irreversible y se perderá toda la información.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPermDeleteConfirmPedido(null)}
                className="px-3 py-2 border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold rounded-lg text-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onPermanentDelete) {
                    onPermanentDelete(permDeleteConfirmPedido.id);
                  }
                  setPermDeleteConfirmPedido(null);
                  showFeedback('Pedido eliminado de forma permanente.');
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
              >
                Eliminar Permanentemente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast feedback toast */}
      {feedbackMessage && (
        <div className="fixed bottom-5 right-5 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-2 border border-slate-700 animate-in slide-in-from-bottom-5 duration-200">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          <span className="font-semibold">{feedbackMessage}</span>
        </div>
      )}

    </div>
  );
}
