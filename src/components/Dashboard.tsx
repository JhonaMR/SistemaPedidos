import { Pedido } from '../types';
import { Clock, CheckCircle2, ChevronRight, ShoppingBag, Package, Truck, AlertTriangle } from 'lucide-react';

interface DashboardProps {
  pedidos: Pedido[];
  vendedor: { nombre: string; codigo: string };
  onNavigateToRegister?: () => void;
  currentUser?: any;
  activeCampana?: string;
}

export default function Dashboard({ pedidos, vendedor, onNavigateToRegister, currentUser, activeCampana = 'Campaña General' }: DashboardProps) {
  const totalOrders = pedidos.length;
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
    ? Math.round((pedidos.filter(p => p.estado === 'Completo').length / totalOrders) * 100) 
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
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-2 rounded-lg flex items-center gap-2 shrink-0">
            <ShoppingBag className="h-4 w-4 text-[#4F46E5]" />
            <span className="text-xs font-bold text-[#334155]">{totalOrders} Pedidos Registrados</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main List & Progress Bars */}
          <div className="lg:col-span-8 space-y-5">
            {statusList.map((status) => {
              const count = pedidos.filter(p => p.estado === status.key).length;
              const totalVal = pedidos.filter(p => p.estado === status.key).reduce((sum, p) => sum + p.total, 0);
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

          {/* Side Efficiency summary card */}
          <div className="lg:col-span-4 flex flex-col justify-between p-5 bg-[#FDFDFD] border border-slate-100 rounded-xl">
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Eficacia Comercial</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Porcentaje de prendas entregadas con éxito sobre el total de órdenes procesadas en el sistema.
              </p>
            </div>

            <div className="my-6 flex flex-col items-center justify-center">
              <div className="relative flex items-center justify-center h-28 w-28">
                {/* Simplified SVG Ring chart */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100"
                    strokeWidth="3"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-emerald-500"
                    strokeDasharray={`${successRate}, 100`}
                    strokeWidth="3"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-2xl font-black text-slate-800">{successRate}%</span>
                  <span className="block text-[8px] uppercase font-bold tracking-wider text-slate-400">Éxito</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span className="text-[11px] font-bold text-emerald-800 leading-tight">
                {successRate}% de entregas completadas satisfactoriamente
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
