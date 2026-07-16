import React, { useState } from 'react';
import { Pedido, Prenda } from '../types';
import { Clock, CheckCircle2, ChevronRight, ShoppingBag, Package, Truck, AlertTriangle, TrendingUp } from 'lucide-react';
import { ViewFotoModal } from './ViewFotoModal';

interface DashboardProps {
  pedidos: Pedido[];
  todosLosPedidos?: Pedido[];
  vendedor: { nombre: string; codigo: string };
  onNavigateToRegister?: () => void;
  onNavigateToHistory?: () => void;
  currentUser?: any;
  activeCampana?: string;
  catalogGarments?: Prenda[];
}

export default function Dashboard({
  pedidos,
  todosLosPedidos,
  vendedor,
  onNavigateToRegister,
  onNavigateToHistory,
  currentUser,
  activeCampana = 'Campaña General',
  catalogGarments = []
}: DashboardProps) {
  const [viewFotoPrenda, setViewFotoPrenda] = useState<Prenda | null>(null);
  const pedidosCampaña = pedidos.filter(p => p.campana === activeCampana);
  const totalOrders = pedidosCampaña.length;
  const nombreVendedor = currentUser?.nombre || vendedor.nombre;
  const codigoVendedor = currentUser?.usuario || vendedor.codigo;

  // Formatting helper
  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  const statusList = [
    { key: 'Pendiente', label: 'Pendiente', color: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', icon: Clock },
    { key: 'Procesado', label: 'Procesado', color: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', icon: Package },
    { key: 'Activo', label: 'Activo', color: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200', icon: Truck },
    { key: 'Completo', label: 'Completo', color: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', icon: CheckCircle2 },
    { key: 'Cancelado', label: 'Cancelado', color: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', icon: AlertTriangle }
  ];

  const successRate = totalOrders > 0
    ? Math.round((pedidosCampaña.filter(p => p.estado === 'Completo').length / totalOrders) * 100)
    : 0;

  return (
    <div id="dashboard-container" className="space-y-6">
      {/* Welcome Banner */}
      <div id="vendedor-hero" className="bg-[#1E293B] text-white rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#334155] rounded-full filter blur-xl opacity-40 -mr-8 -mt-8" />
        <div className="absolute bottom-0 left-1/3 w-24 h-24 bg-[#475569] rounded-full filter blur-lg opacity-20 -ml-8 -mb-8" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 bg-[#4F46E5] text-[10px] uppercase tracking-wider font-semibold rounded-full text-[#E0E7FF]">
                {activeCampana}
              </span>
              <span className="text-xs text-[#94A3B8] font-mono">ID: {codigoVendedor}</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
              ¡Hola, {nombreVendedor}!
            </h2>
          </div>

          {onNavigateToRegister && (
            <button
              onClick={onNavigateToRegister}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-1.5 self-start md:self-auto"
            >
              <span>Registrar pedido</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Order Status Section */}
      <div id="status-breakdown-card" className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#F1F5F9] pb-4 mb-6 gap-2">
          <div>
            <h3 className="text-md font-bold text-[#1E293B] uppercase tracking-wider">Estado de Pedidos</h3>
            <p className="text-xs text-[#64748B]">Distribución y progreso logístico en tiempo real de todas tus prendas pedidas.</p>
          </div>
          <div 
            onClick={onNavigateToHistory}
            className={`bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-2 rounded-lg flex items-center gap-2 shrink-0 ${onNavigateToHistory ? 'cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-all' : ''}`}
          >
            <ShoppingBag className="h-4 w-4 text-[#4F46E5]" />
            <span className="text-xs font-bold text-[#334155]">{totalOrders} Pedidos Registrados</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main List & Progress Bars */}
          <div className="lg:col-span-8 space-y-5">
            {statusList.map((status) => {
              const count = pedidosCampaña.filter(p => p.estado === status.key).length;
              const totalVal = pedidosCampaña.filter(p => p.estado === status.key).reduce((sum, p) => sum + p.total, 0);
              const percentage = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
              const StatusIcon = status.icon;

              return (
                <div key={status.key} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${status.bg} ${status.text}`}>
                        <StatusIcon className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-[#334155]">{status.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 font-medium">{count} ped. ({percentage}%)</span>
                      <span className="font-semibold text-slate-900">{formatCOP(totalVal)}</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${status.color} transition-all duration-500 ease-out`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {(() => {
            // Calcular referencias más vendidas de todos los pedidos activos de la campaña actual (sin importar el usuario, excluyendo Cancelado)
            const listaPedidosParaTop = todosLosPedidos || pedidos;
            const pedidosActivosCampaña = listaPedidosParaTop.filter(p => p.estado !== 'Cancelado' && p.campana === activeCampana);

            const refMap: Record<string, { ref: string; nombre: string; cantidad: number; totalVendido: number }> = {};

            pedidosActivosCampaña.forEach(p => {
              (p.items || []).forEach(item => {
                const ref = item.prendaRef;
                if (!refMap[ref]) {
                  refMap[ref] = {
                    ref,
                    nombre: item.nombrePrenda,
                    cantidad: 0,
                    totalVendido: 0
                  };
                }
                refMap[ref].cantidad += item.cantidad || 0;
                refMap[ref].totalVendido += item.total || 0;
              });
            });

            const topReferences = Object.values(refMap)
              .sort((a, b) => b.cantidad - a.cantidad)
              .slice(0, 5);

            const maxQty = topReferences.length > 0 ? topReferences[0].cantidad : 1;

            return (
              <div className="lg:col-span-4 p-5 bg-[#FDFDFD] border border-slate-100 rounded-xl flex flex-col justify-between min-h-[320px]">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-indigo-600" />
                      <span>Top 5 Referencias Más Vendidas</span>
                    </h4>
                  </div>

                  {topReferences.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      No hay ventas registradas aún.
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-[380px] overflow-y-auto pr-1">
                      {topReferences.map((refData, index) => {
                        const percentage = Math.round((refData.cantidad / maxQty) * 100);
                        return (
                          <div 
                            key={refData.ref} 
                            className="relative group cursor-pointer"
                            onClick={() => {
                              const found = catalogGarments.find(g => g.ref === refData.ref);
                              const prenda = found || {
                                ref: refData.ref,
                                nombre: refData.nombre,
                                precioBase: refData.totalVendido / (refData.cantidad || 1),
                                tallasDisponibles: ['N/A'],
                                imagenUrl: '',
                                stock: 0
                              };
                              setViewFotoPrenda(prenda as Prenda);
                            }}
                          >
                            {/* Background Bar */}
                            <div
                              className="absolute inset-0 bg-indigo-50/20 rounded-lg -z-10 group-hover:bg-indigo-50/40 transition-colors"
                              style={{ width: `${percentage}%` }}
                            />
                            <div className="flex items-center justify-between p-2 rounded-lg text-xs">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className={`h-5 w-5 rounded-md flex items-center justify-center font-bold text-[10px] ${index === 0 ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                  index === 1 ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                                    index === 2 ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                                      'bg-slate-50 text-slate-500 border border-slate-100'
                                  }`}>
                                  {index + 1}
                                </span>
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-800 truncate leading-snug">Ref: {refData.ref}</div>
                                  <div className="text-[10px] text-slate-500 font-semibold truncate leading-snug">{refData.nombre}</div>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="font-extrabold text-slate-800 leading-snug">{refData.cantidad} uds</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {viewFotoPrenda && (
        <ViewFotoModal
          prenda={viewFotoPrenda}
          onClose={() => setViewFotoPrenda(null)}
        />
      )}
    </div>
  );
}
