import { useState, FormEvent, useEffect } from 'react';
import { Cliente, Prenda, ItemPedido, Pedido } from '../types';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Sparkles,
  User,
  CheckCircle,
  Info,
  Calendar,
  CreditCard,
  Percent,
  DollarSign,
  X,
  Image as ImageIcon,
  Edit3
} from 'lucide-react';
import { ViewFotoModal } from './ViewFotoModal';
import { getSortedTallasStr } from '../utils/sizeHelper';

interface OrderFormProps {
  clientes: Cliente[];
  pedidos: Pedido[];
  activeCampana: string;
  campanasReferencias: Record<string, string[]>;
  onAddPedido: (pedido: Omit<Pedido, 'id' | 'numeroPedido' | 'fecha'>) => void;
  onQuickAddCliente: (cliente: Omit<Cliente, 'id' | 'fechaRegistro'>) => Cliente;
  vendedor: { nombre: string; codigo: string };
  catalogGarments?: Prenda[];
  editingPedido?: Pedido | null;
  onUpdatePedido?: (updated: Pedido) => void;
  onCancel?: () => void;
  onUpdateActiveClientRedirect?: (clientId: string) => void;
}

export default function OrderForm({
  clientes,
  pedidos,
  activeCampana,
  campanasReferencias,
  onAddPedido,
  onQuickAddCliente,
  vendedor,
  catalogGarments = [],
  editingPedido = null,
  onUpdatePedido = () => { },
  onCancel = () => { },
  onUpdateActiveClientRedirect
}: OrderFormProps) {
  // Filter catalogGarments by campaign references
  const listToUse = catalogGarments || [];
  const enabledIds = campanasReferencias?.[activeCampana] || listToUse.map(p => p.ref);
  const campanaGarments = listToUse.filter(p => enabledIds.includes(p.ref));
  const availableCategories = Array.from(new Set(campanaGarments.flatMap(p => Array.isArray(p.categoria) ? p.categoria : [p.categoria]).filter(Boolean)));

  // Order States
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [cart, setCart] = useState<ItemPedido[]>([]);
  const [facturacionFE, setFacturacionFE] = useState(100);
  const [facturacionRM, setFacturacionRM] = useState(0);
  const [isDividedInvoicing, setIsDividedInvoicing] = useState(false);
  const [porcentajeDescuento, setPorcentajeDescuento] = useState(0);
  const [notas, setNotas] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [fechaLimiteDespacho, setFechaLimiteDespacho] = useState('');
  const [showBillingErrorModal, setShowBillingErrorModal] = useState(false);
  const [viewFotoPrenda, setViewFotoPrenda] = useState<Prenda | null>(null);

  // Mass Edit Quantities states
  const [showMassQtyModal, setShowMassQtyModal] = useState(false);
  const [massQtyMode, setMassQtyMode] = useState<'flat' | 'sizes'>('flat');
  const [massFlatQty, setMassFlatQty] = useState<number | ''>('');
  const [massSizesQty, setMassSizesQty] = useState<Record<string, Record<string, number>>>({});

  // Extra Reference modal states
  const [showAddExtraModal, setShowAddExtraModal] = useState(false);
  const [extraRef, setExtraRef] = useState('');
  const [extraCategory, setExtraCategory] = useState<'Dama' | 'Plus' | 'Niña' | 'Niño' | 'Colegial'>('Dama');
  const [extraUnitPrice, setExtraUnitPrice] = useState<number | ''>('');
  const [extraNovedad, setExtraNovedad] = useState('');
  const [extraTallasCantidades, setExtraTallasCantidades] = useState<Record<string, number>>({ 'N/A': 1 });
  const [foundExtraPrenda, setFoundExtraPrenda] = useState<Prenda | null>(null);

  // Client Quick Add states
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [quickCodigo, setQuickCodigo] = useState('');
  const [quickNombre, setQuickNombre] = useState('');
  const [quickDoc, setQuickDoc] = useState('');
  const [quickTel, setQuickTel] = useState('');
  const [quickCiudad, setQuickCiudad] = useState('');
  const [quickDireccion, setQuickDireccion] = useState('');

  useEffect(() => {
    if (isQuickAdding && clientes) {
      const consecutiveCodes = clientes
        .map(c => {
          const match = c.codigoCliente?.match(/\d+/);
          return match ? parseInt(match[0], 10) : NaN;
        })
        .filter(n => !isNaN(n));
      const maxCode = consecutiveCodes.length > 0 ? Math.max(...consecutiveCodes) : 0;
      const nextConsecutive = String(maxCode + 1).padStart(3, '0');
      setQuickCodigo(nextConsecutive);
    }
  }, [isQuickAdding, clientes]);

  // Active Catalog Item selection state
  const [selectedPrenda, setSelectedPrenda] = useState<Prenda | null>(null);
  const [tallasCantidades, setTallasCantidades] = useState<Record<string, number>>({ 'N/A': 1 });
  const [novedad, setNovedad] = useState('');
  const [addFeedback, setAddFeedback] = useState<string | null>(null);
  const [customUnitPrice, setCustomUnitPrice] = useState<number>(0);

  // Edit Cart Item modal state
  const [editingCartItem, setEditingCartItem] = useState<ItemPedido | null>(null);
  const [showUpdateClientConfirmModal, setShowUpdateClientConfirmModal] = useState(false);
  const [editTallasCantidades, setEditTallasCantidades] = useState<Record<string, number>>({});
  const [editUnitPrice, setEditUnitPrice] = useState<number>(0);
  const [editNovedad, setEditNovedad] = useState<string>('');

  useEffect(() => {
    if (selectedPrenda) {
      setCustomUnitPrice(selectedPrenda.precioBase);
    } else {
      setCustomUnitPrice(0);
    }
  }, [selectedPrenda]);

  useEffect(() => {
    if (editingPedido) {
      setSelectedClientId(editingPedido.clienteId);
      setClientSearchQuery(editingPedido.clienteNombre);
      setCart(editingPedido.items || []);
      const fe = editingPedido.facturacionFE !== undefined ? editingPedido.facturacionFE : 100;
      const rm = editingPedido.facturacionRM !== undefined ? editingPedido.facturacionRM : 0;
      setFacturacionFE(fe);
      setFacturacionRM(rm);
      setIsDividedInvoicing(fe !== 100 || rm !== 0);
      setPorcentajeDescuento(editingPedido.porcentajeDescuento || 0);
      setNotas(editingPedido.notas || '');
      setFechaEntrega(editingPedido.fechaEntregaEstimada);
      setFechaLimiteDespacho(editingPedido.fechaLimiteDespacho || '');
    } else {
      setSelectedClientId('');
      setClientSearchQuery('');
      setCart([]);
      setFacturacionFE(100);
      setFacturacionRM(0);
      setIsDividedInvoicing(false);
      setPorcentajeDescuento(0);
      setNotas('');
      setFechaEntrega(new Date().toISOString().split('T')[0]);
      setFechaLimiteDespacho('');
    }
  }, [editingPedido]);

  // Auto-select first garment of the campaign if none is selected
  const [lastCampana, setLastCampana] = useState(activeCampana);
  if (activeCampana !== lastCampana) {
    setLastCampana(activeCampana);
    setSelectedPrenda(null);
    setTallasCantidades({ 'N/A': 1 });
  }

  if (selectedPrenda === null && campanaGarments.length > 0) {
    setSelectedPrenda(campanaGarments[0]);
    setTallasCantidades({ 'N/A': 1 });
  }

  // Formatting helpers
  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(val);
  };

  // Select first talla when product changes
  const handleSelectPrenda = (prenda: Prenda) => {
    setSelectedPrenda(prenda);
    setTallasCantidades({ 'N/A': 1 });
    setNovedad('');
    setAddFeedback(null);
  };

  const handleQuickAddClientSubmit = (e: FormEvent) => {
    e.preventDefault();
    const isOffline = !navigator.onLine;
    const finalCodigo = isOffline ? '000' : quickCodigo.trim();

    if (!quickNombre.trim() || !quickDoc.trim() || !quickTel.trim() || (!isOffline && !finalCodigo)) return;

    let formattedCodigo = finalCodigo;
    if (/^\d+$/.test(formattedCodigo)) {
      formattedCodigo = formattedCodigo.padStart(3, '0');
    }

    const newC = onQuickAddCliente({
      codigoCliente: formattedCodigo,
      nombre: quickNombre,
      documentoIdentidad: quickDoc,
      telefono: quickTel,
      correo: 'N/A',
      direccion: quickDireccion,
      ciudad: quickCiudad || 'Sin especificar',
      notas: 'Añadido rápido en toma de pedido.'
    });

    setSelectedClientId(newC.id);
    setIsQuickAdding(false);
    setQuickCodigo('');
    setQuickNombre('');
    setQuickDoc('');
    setQuickTel('');
    setQuickCiudad('');
    setQuickDireccion('');
  };

  const handleAddToCart = () => {
    if (!selectedPrenda) return;

    const activeTallas = (Object.entries(tallasCantidades) as [string, number][]).filter(([_, qty]) => qty > 0);
    if (activeTallas.length === 0) {
      alert('Por favor selecciona al menos una talla y define su cantidad.');
      return;
    }

    const noveltyTrim = novedad.trim();
    const noveltyText = noveltyTrim ? noveltyTrim : undefined;

    // Check if there is an item with the same garment AND same novelty AND same price in the cart
    const existingIndex = cart.findIndex(
      item =>
        item.prendaRef === selectedPrenda.ref &&
        (item.novedad || '') === (novedad || '').trim() &&
        item.precioUnitario === customUnitPrice
    );

    const newTallasDetalle = { ...tallasCantidades } as Record<string, number>;

    if (existingIndex > -1) {
      // Merge with existing cart item
      const existingItem = cart[existingIndex];
      const mergedTallasDetalle = { ...(existingItem.tallasDetalle || {}) } as Record<string, number>;

      Object.entries(newTallasDetalle).forEach(([t, qty]) => {
        mergedTallasDetalle[t] = (mergedTallasDetalle[t] || 0) + qty;
      });

      const totalQty = Object.values(mergedTallasDetalle).reduce((sum, q) => sum + q, 0);
      const formattedTallaStr = getSortedTallasStr(mergedTallasDetalle);

      const updated = [...cart];
      updated[existingIndex] = {
        ...existingItem,
        tallasDetalle: mergedTallasDetalle,
        talla: formattedTallaStr,
        cantidad: totalQty,
        total: totalQty * customUnitPrice
      };
      setCart(updated);
    } else {
      // Add a new row
      const totalQty = activeTallas.reduce((sum, [_, q]) => sum + q, 0);
      const formattedTallaStr = getSortedTallasStr(newTallasDetalle);

      const newItem: ItemPedido = {
        id: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        prendaRef: selectedPrenda.ref,
        nombrePrenda: selectedPrenda.nombre,
        categoria: Array.isArray(selectedPrenda.categoria) ? selectedPrenda.categoria.join(' / ') : selectedPrenda.categoria,
        talla: formattedTallaStr,
        tallasDetalle: newTallasDetalle,
        novedad: noveltyText,
        cantidad: totalQty,
        precioUnitario: customUnitPrice,
        total: totalQty * customUnitPrice
      };
      setCart(prev => [...prev, newItem]);
    }

    const sizeSummaryText = activeTallas.map(([t, q]) => `${t}-${q}`).join(', ');
    setAddFeedback(`Añadido: ${selectedPrenda.nombre} - Tallas: ${sizeSummaryText}`);
    setTimeout(() => setAddFeedback(null), 3550);
    setTallasCantidades({ 'N/A': 1 });
    setNovedad('');
  };

  const handleRemoveFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleOpenEditCartModal = (item: ItemPedido) => {
    setEditingCartItem(item);
    setEditTallasCantidades({ ...(item.tallasDetalle || {}) });
    setEditUnitPrice(item.precioUnitario);
    setEditNovedad(item.novedad || '');
  };

  const handleSaveEditCartItem = () => {
    if (!editingCartItem) return;

    const activeTallas = (Object.entries(editTallasCantidades) as [string, number][]).filter(([_, qty]) => qty > 0);
    if (activeTallas.length === 0) {
      alert('Por favor selecciona al menos una talla y define su cantidad.');
      return;
    }

    const noveltyTrim = editNovedad.trim();
    const noveltyText = noveltyTrim ? noveltyTrim : undefined;

    const totalQty = activeTallas.reduce((sum, [_, q]) => sum + q, 0);
    const formattedTallaStr = getSortedTallasStr(editTallasCantidades as Record<string, number>);

    const updatedCart = cart.map(item => {
      if (item.id === editingCartItem.id) {
        return {
          ...item,
          tallasDetalle: { ...editTallasCantidades } as Record<string, number>,
          talla: formattedTallaStr,
          novedad: noveltyText,
          cantidad: totalQty,
          precioUnitario: editUnitPrice,
          total: totalQty * editUnitPrice
        };
      }
      return item;
    });

    setCart(updatedCart);
    setEditingCartItem(null);
  };

  // Mass Edit Handlers
  const handleOpenMassQtyModal = () => {
    setMassFlatQty('');

    // Inicializar cantidades por talla de categoría a partir de las prendas en el carrito
    const initSizesQty: Record<string, Record<string, number>> = {};
    const categoriesInCart = Array.from(new Set(cart.map(item => item.categoria))) as string[];

    categoriesInCart.forEach((cat: string) => {
      initSizesQty[cat] = {};
      const itemsInCat = cart.filter(item => item.categoria === cat);
      const uniqueSizes = Array.from(new Set(
        itemsInCat.flatMap(item => {
          const prenda = catalogGarments.find(p => p.ref === item.prendaRef);
          return prenda 
            ? (Array.isArray(prenda.tallasDisponibles) ? prenda.tallasDisponibles : []) 
            : getAvailableSizesForCategory(item.categoria);
        })
      )) as string[];

      uniqueSizes.forEach((sz: string) => {
        initSizesQty[cat][sz] = 0;
      });
    });

    setMassSizesQty(initSizesQty);
    setMassQtyMode('flat');
    setShowMassQtyModal(true);
  };

  const handleApplyMassQty = () => {
    if (massQtyMode === 'flat') {
      const flatVal = parseInt(massFlatQty as any);
      if (isNaN(flatVal) || flatVal <= 0) {
        alert('Por favor ingresa una cantidad válida mayor a 0.');
        return;
      }

      const updatedCart = cart.map(item => ({
        ...item,
        tallasDetalle: { 'N/A': flatVal },
        talla: 'N/A',
        cantidad: flatVal,
        total: flatVal * item.precioUnitario
      }));

      setCart(updatedCart);
    } else {
      // Modo tallas
      // Validar si al menos se ingresó alguna cantidad en el modal
      let totalEntered = 0;
      Object.values(massSizesQty).forEach((catSizes: any) => {
        Object.values(catSizes).forEach((qty: any) => {
          totalEntered += (qty as number);
        });
      });

      if (totalEntered === 0) {
        alert('Por favor ingresa al menos una cantidad mayor a 0 en alguna talla.');
        return;
      }

      const updatedCart = cart.map(item => {
        const catConfig = massSizesQty[item.categoria] || {};
        const totalConfiguredForCat = Object.values(catConfig).reduce((sum: number, val: any) => sum + (val as number), 0);

        // Si no se configuró nada para esta categoría, no la modificamos
        if (totalConfiguredForCat === 0) {
          return item;
        }
        const prenda = catalogGarments.find(p => p.ref === item.prendaRef);
        const supportedSizes = prenda 
          ? (Array.isArray(prenda.tallasDisponibles) ? prenda.tallasDisponibles : []) 
          : getAvailableSizesForCategory(item.categoria);
        const newTallasDetalle: Record<string, number> = {};
        let newQty = 0;

        supportedSizes.forEach(sz => {
          const qty = catConfig[sz] || 0;
          if (qty > 0) {
            newTallasDetalle[sz] = qty;
            newQty += qty;
          }
        });

        const formattedTallaStr = getSortedTallasStr(newTallasDetalle);
        return {
          ...item,
          tallasDetalle: newTallasDetalle,
          talla: formattedTallaStr,
          cantidad: newQty,
          total: newQty * item.precioUnitario
        };
      });

      setCart(updatedCart);
    }

    setShowMassQtyModal(false);
  };

  // Extra Reference Handlers & Helpers
  const getAvailableSizesForCategory = (cat: string) => {
    if (cat === 'Colegial') return ['2/4', '6/8', '10/12', '14/16', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
    if (cat === 'Dama') return ['S', 'M', 'L'];
    if (cat === 'Plus') return ['XL', '2XL', '3XL'];
    if (cat === 'Niña' || cat === 'Niño') return ['2/4', '6/8', '10/12', '14/16'];
    return [];
  };

  const handleOpenAddExtraProductModal = () => {
    setExtraRef('');
    setExtraCategory('Dama');
    setExtraUnitPrice('');
    setExtraNovedad('');
    setExtraTallasCantidades({ 'N/A': 1 });
    setFoundExtraPrenda(null);
    setShowAddExtraModal(true);
  };

  useEffect(() => {
    const cleanRef = extraRef.trim().toUpperCase();
    if (!cleanRef) {
      setFoundExtraPrenda(null);
      return;
    }

    const found = catalogGarments.find(p => p.ref.toUpperCase() === cleanRef);
    if (found) {
      setFoundExtraPrenda(found);
      setExtraUnitPrice(found.precioBase);
      
      let matchedCat: 'Dama' | 'Plus' | 'Niña' | 'Niño' | 'Colegial' | null = null;
      if (Array.isArray(found.categoria) && found.categoria.length > 0) {
        matchedCat = found.categoria[0];
      } else if (typeof found.categoria === 'string') {
        matchedCat = found.categoria;
      }
      
      if (matchedCat) {
        setExtraCategory(matchedCat);
      }
    } else {
      setFoundExtraPrenda(null);
    }
  }, [extraRef, catalogGarments]);

  const handleSaveExtraItem = () => {
    const cleanRef = extraRef.trim().toUpperCase();
    if (!cleanRef) {
      alert('Por favor ingresa una referencia.');
      return;
    }

    const unitPrice = parseFloat(extraUnitPrice as any);
    if (isNaN(unitPrice) || unitPrice < 0) {
      alert('Por favor ingresa un precio de venta válido.');
      return;
    }

    const activeTallas = (Object.entries(extraTallasCantidades) as [string, number][]).filter(([_, qty]) => qty > 0);
    if (activeTallas.length === 0) {
      alert('Por favor selecciona al menos una talla y define su cantidad.');
      return;
    }

    // Al imprimir el pedido, el nombre de la referencia debe ser el de la prenda encontrada o "Prenda " + etiqueta.toLowerCase()
    const nombrePrenda = foundExtraPrenda 
      ? foundExtraPrenda.nombre 
      : `Prenda ${extraCategory.toLowerCase()}`;
    const totalQty = activeTallas.reduce((sum, [_, q]) => sum + q, 0);
    const formattedTallaStr = getSortedTallasStr(extraTallasCantidades);

    const newItem: ItemPedido = {
      id: `extra_${Date.now()}`,
      prendaRef: cleanRef,
      nombrePrenda: nombrePrenda,
      categoria: extraCategory,
      talla: formattedTallaStr,
      tallasDetalle: { ...extraTallasCantidades },
      novedad: extraNovedad.trim() ? extraNovedad.trim() : undefined,
      cantidad: totalQty,
      precioUnitario: unitPrice,
      total: totalQty * unitPrice
    };

    setCart(prev => [...prev, newItem]);
    setShowAddExtraModal(false);
  };

  // Cart totals
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const montoDescuento = Math.round((subtotal * porcentajeDescuento) / 100);
  const total = subtotal - montoDescuento;

  const handleSubmitOrder = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      alert('Por favor selecciona o registra un cliente.');
      return;
    }
    if (cart.length === 0) {
      alert('El carrito está vacío. Añade prendas para registrar el pedido.');
      return;
    }

    if (isDividedInvoicing && (Number(facturacionFE) + Number(facturacionRM) !== 100)) {
      setShowBillingErrorModal(true);
      return;
    }

    const client = clientes.find(c => c.id === selectedClientId)!;

    if (editingPedido) {
      onUpdatePedido({
        ...editingPedido,
        clienteId: client.id,
        clienteNombre: client.nombre,
        clienteTelefono: client.telefono,
        items: cart,
        subtotal,
        porcentajeDescuento,
        montoDescuento,
        total,
        notas,
        fechaEntregaEstimada: fechaEntrega,
        fechaLimiteDespacho: fechaLimiteDespacho,
        facturacionFE: isDividedInvoicing ? facturacionFE : 100,
        facturacionRM: isDividedInvoicing ? facturacionRM : 0,
        editado: true
      });
      alert('¡Pedido editado con éxito!');
    } else {
      onAddPedido({
        clienteId: client.id,
        clienteNombre: client.nombre,
        clienteTelefono: client.telefono,
        vendedorNombre: vendedor.nombre,
        items: cart,
        subtotal,
        porcentajeDescuento,
        montoDescuento,
        total,
        estado: 'Pendiente',
        notas,
        fechaEntregaEstimada: fechaEntrega,
        fechaLimiteDespacho: fechaLimiteDespacho,
        facturacionFE: isDividedInvoicing ? facturacionFE : 100,
        facturacionRM: isDividedInvoicing ? facturacionRM : 0,
      });
      alert('¡Pedido registrado con éxito!');
    }

    // Reset Form
    setSelectedClientId('');
    setClientSearchQuery('');
    setCart([]);
    setPorcentajeDescuento(0);
    setNotas('');
  };

  // Autocomplete filtering
  const filteredAutocompleteClients = clientSearchQuery.trim().length >= 3
    ? clientes.filter(c =>
      c.nombre.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
      (c.codigoCliente || '').toLowerCase().includes(clientSearchQuery.toLowerCase())
    )
    : [];

  const selectedClient = clientes.find(c => c.id === selectedClientId);

  return (
    <div id="order-creation-form" className="space-y-6">

      {/* Step 1: Client Selection banner */}
      <div id="client-selection-panel" className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 mb-4 gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A5D4E] flex items-center gap-1.5">
            <User className="h-4.5 w-4.5" />
            <span>1. Datos del Cliente</span>
          </h3>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
            {!isQuickAdding && !selectedClientId && (
              <button
                id="btn-quick-add-client-toggle"
                type="button"
                onClick={() => setIsQuickAdding(true)}
                className="px-3 py-1.5 bg-[#FAF7F0] border border-[#C4BFA6] hover:bg-[#F3EFE4] text-xs font-bold uppercase rounded-lg text-[#6A5E4E] transition-all shrink-0 animate-fade-in cursor-pointer"
              >
                + Nuevo cliente
              </button>
            )}
            {selectedClientId && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClientId('');
                    setClientSearchQuery('');
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 hover:text-rose-800 text-xs font-bold uppercase rounded-lg transition-all shrink-0 shadow-sm animate-fade-in cursor-pointer"
                >
                  Cambiar Cliente
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (cart.length > 0) {
                      setShowUpdateClientConfirmModal(true);
                    } else {
                      if (onUpdateActiveClientRedirect) {
                        onUpdateActiveClientRedirect(selectedClientId);
                      }
                    }
                  }}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 hover:text-amber-900 text-xs font-bold uppercase rounded-lg transition-all shrink-0 shadow-sm animate-fade-in cursor-pointer"
                >
                  Actualizar Cliente
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-bold uppercase rounded-lg transition-all shrink-0 shadow-sm cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>

        {!isQuickAdding ? (
          <div className="flex flex-col gap-3">
            <div className="w-full relative">
              {!selectedClientId ? (
                <div>
                  <label htmlFor="autocomplete-order-client" className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                    Buscar Cliente (Escribe mínimo 3 letras o números)
                  </label>
                  <div className="relative">
                    <input
                      id="autocomplete-order-client"
                      type="text"
                      placeholder="Escribe el nombre o documento de identidad del cliente..."
                      value={clientSearchQuery}
                      onChange={(e) => {
                        setClientSearchQuery(e.target.value);
                        setShowClientSuggestions(true);
                      }}
                      onFocus={() => setShowClientSuggestions(true)}
                      className="w-full p-2.5 pr-10 bg-[#FAFBFD] border border-[#CBD5E1] rounded-lg text-sm text-slate-700 focus:ring-1 focus:ring-[#4A5D4E] focus:outline-none"
                    />

                    {clientSearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setClientSearchQuery('');
                          setSelectedClientId('');
                          setShowClientSuggestions(false);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 transition-colors p-1"
                        title="Limpiar búsqueda"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}

                    {/* Floating suggestions dropdown */}
                    {showClientSuggestions && clientSearchQuery.trim().length >= 3 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {filteredAutocompleteClients.length > 0 ? (
                          filteredAutocompleteClients.map((c) => (
                            <div
                              key={c.id}
                              onClick={() => {
                                setSelectedClientId(c.id);
                                setClientSearchQuery(c.nombre);
                                setShowClientSuggestions(false);
                              }}
                              className="p-2.5 hover:bg-slate-50 cursor-pointer text-xs flex justify-between items-center"
                            >
                              <div>
                                <span className="font-bold text-slate-800">{c.nombre}</span>
                                <span className="block text-[10px] text-slate-500 font-mono">ID: {c.codigoCliente} . NIT: {c.documentoIdentidad} . DIR: {c.direccion || 'N/A'}</span>
                              </div>
                              <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-semibold">{c.ciudad}</span>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-xs text-slate-400 italic text-center">
                            No se encontraron clientes coincidentes
                          </div>
                        )}
                      </div>
                    )}

                    {clientSearchQuery.trim().length > 0 && clientSearchQuery.trim().length < 3 && (
                      <p className="text-[10px] text-[#A17A3D] mt-1 font-medium">Escribe {3 - clientSearchQuery.trim().length} caracteres más para buscar...</p>
                    )}
                  </div>
                </div>
              ) : (
                (() => {
                  const prefijoVendedor = vendedor.codigo || '01';
                  const pedidosVendedor = pedidos.filter(p => p.numeroPedido.startsWith(`${prefijoVendedor}-`));
                  let siguienteCorrelativo = 1;
                  if (pedidosVendedor.length > 0) {
                    const correlativos = pedidosVendedor.map(p => {
                      const parts = p.numeroPedido.split('-');
                      const corr = parseInt(parts[1], 10);
                      return isNaN(corr) ? 0 : corr;
                    });
                    siguienteCorrelativo = Math.max(...correlativos) + 1;
                  }
                  const consecutiveText = editingPedido
                    ? editingPedido.numeroPedido
                    : `${prefijoVendedor}-${String(siguienteCorrelativo).padStart(3, '0')}`;

                  return (
                    <div className="bg-slate-50 border border-indigo-100 rounded-lg p-3 shadow-sm text-left">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2.5 border-b border-slate-200">
                        {/* Client details block: takes full width */}
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-indigo-50 rounded text-indigo-600 shrink-0">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">ID: {selectedClient?.codigoCliente}</span>
                            <h4 className="text-sm font-extrabold text-slate-900 leading-tight">{selectedClient?.nombre}</h4>
                          </div>
                        </div>

                        {/* Consecutive Badge & Billing percentages selector (below on mobile, side-by-side on desktop) */}
                        <div className="flex flex-wrap items-center gap-1.5 justify-start sm:justify-end w-full sm:w-auto shrink-0">
                          {/* Porcentaje de Facturación Selector */}
                          <div className="flex items-center">
                            {!isDividedInvoicing ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsDividedInvoicing(true);
                                  setFacturacionFE(50);
                                  setFacturacionRM(50);
                                }}
                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-350 text-emerald-800 text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 uppercase tracking-wide transition-all hover:scale-[1.01] active:scale-95 cursor-pointer"
                                title="Facturación: 100% FE. Clic para dividir."
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span>100% FE</span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 px-2 py-1 rounded-lg shadow-xs transition-all max-w-[240px]">
                                <div className="flex items-center gap-0.5">
                                  <span className="text-[10px] font-bold text-amber-950 font-mono">FE:</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={facturacionFE}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => {
                                      const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                      setFacturacionFE(val);
                                    }}
                                    className="w-10 text-center p-0.5 bg-white border border-amber-300 rounded text-xs font-bold text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                                  />
                                  <span className="text-[10px] font-bold text-amber-950">%</span>
                                </div>
                                <div className="flex items-center gap-0.5">
                                  <span className="text-[10px] font-bold text-amber-950 font-mono">RM:</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={facturacionRM}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => {
                                      const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                      setFacturacionRM(val);
                                    }}
                                    className="w-10 text-center p-0.5 bg-white border border-amber-300 rounded text-xs font-bold text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                                  />
                                  <span className="text-[10px] font-bold text-amber-950">%</span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsDividedInvoicing(false);
                                    setFacturacionFE(100);
                                    setFacturacionRM(0);
                                  }}
                                  className="p-0.5 hover:bg-amber-100 rounded text-amber-900 transition-colors cursor-pointer"
                                  title="Volver a 100 FE"
                                >
                                  <X className="h-3.5 w-3.5 stroke-[2.5]" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Consecutive Badge */}
                          <div className="bg-indigo-600 text-white text-xs font-bold font-mono px-2.5 py-1.5 rounded-lg shadow-xs tracking-wide flex items-center justify-center transition-all hover:scale-[1.01]">
                            {consecutiveText}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-1.5 text-[11px] pt-2">
                        <div>
                          <span className="text-slate-400 font-medium block">Cédula / NIT</span>
                          <span className="font-bold text-slate-700 font-mono">{selectedClient?.documentoIdentidad}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block">Celular / Teléfono</span>
                          <span className="font-bold text-slate-700">{selectedClient?.telefono}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block">Ciudad</span>
                          <span className="font-bold text-slate-700">{selectedClient?.ciudad}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block">Dirección</span>
                          <span className="font-bold text-indigo-600 underline decoration-indigo-200 truncate block max-w-full" title={selectedClient?.direccion || 'No registrada'}>
                            {selectedClient?.direccion || 'No registrada'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block">Correo Electrónico</span>
                          <span className="font-bold text-slate-700 truncate block max-w-full" title={selectedClient?.correo || 'No registrado'}>
                            {selectedClient?.correo || 'No registrado'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleQuickAddClientSubmit} className="bg-[#FAF9F5] border border-[#E9E4D4] p-4 rounded-lg space-y-3">
            <div className="flex justify-between items-center pb-1 border-b border-[#ECE7D6]">
              <h4 className="text-xs font-bold text-[#6A5E4E] uppercase">Registro de Cliente.</h4>
              <button
                type="button"
                onClick={() => setIsQuickAdding(false)}
                className="text-xs text-[#9E9585] hover:text-[#2C2A29]"
              >
                Cancelar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-2.5">
              <div>
                <input
                  type="text"
                  required
                  disabled={!navigator.onLine}
                  placeholder={!navigator.onLine ? "000 (Modo Offline)" : "ID Cliente (3 dígitos)"}
                  value={!navigator.onLine ? "000" : quickCodigo}
                  onChange={(e) => setQuickCodigo(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded text-xs font-mono disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
              <div>
                <input
                  type="text"
                  required
                  placeholder="Nombre Cliente"
                  value={quickNombre}
                  onChange={(e) => setQuickNombre(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded text-xs"
                />
              </div>
              <div>
                <input
                  type="text"
                  required
                  placeholder="Identificación / NIT"
                  value={quickDoc}
                  onChange={(e) => setQuickDoc(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded text-xs"
                />
              </div>
              <div>
                <input
                  type="text"
                  required
                  placeholder="Teléfono Celular"
                  value={quickTel}
                  onChange={(e) => setQuickTel(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded text-xs"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Dirección"
                  value={quickDireccion}
                  onChange={(e) => setQuickDireccion(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded text-xs"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Ciudad"
                  value={quickCiudad}
                  onChange={(e) => setQuickCiudad(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#4A5D4E] hover:bg-[#3D4C3F] text-white text-xs font-bold rounded"
              >
                Crear y Seleccionar
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Step 2: Apparel Item Selector Grid & Configuration */}
      {!selectedClientId ? (
        <div id="apparel-selection-locked" className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-10 text-center text-slate-500 space-y-3">
          <User className="h-10 w-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">Selección de prendas bloqueada</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Por favor selecciona o registra un cliente en el paso anterior para habilitar el catálogo de referencias y poder registrar su pedido.
          </p>
        </div>
      ) : (
        <div id="apparel-selection-panel" className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Garment Selector Column (7 Cols) */}
          <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A5D4E] flex items-center gap-1.5">
                <ShoppingBag className="h-4.5 w-4.5" />
                <span>2. Catálogo de Referencias</span>
              </h3>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  id="select-catalog-category-filter"
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="px-2 py-1.5 bg-[#FAFBFD] border border-[#E2E8F0] rounded-lg text-xs text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-[#4A5D4E] cursor-pointer w-24 sm:w-28 truncate"
                >
                  <option value="">Todo</option>
                  {['Dama', 'Plus', 'Niña', 'Niño', 'Colegial'].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Buscar por SKU, nombre..."
                  value={catalogSearchQuery}
                  onChange={(e) => setCatalogSearchQuery(e.target.value)}
                  className="px-2.5 py-1.5 bg-[#FAFBFD] border border-[#E2E8F0] rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#4A5D4E] min-w-[160px]"
                />
              </div>
            </div>

            <div id="garments-catalog-scroller" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-[480px] overflow-y-auto pr-1">
              {campanaGarments.filter(prenda => {
                const prendaCats = Array.isArray(prenda.categoria) ? prenda.categoria : [prenda.categoria];
                if (selectedCategoryFilter && !prendaCats.includes(selectedCategoryFilter as any)) {
                  return false;
                }
                const query = catalogSearchQuery.trim().toLowerCase();
                if (!query) return true;
                return (
                  prenda.nombre.toLowerCase().includes(query) ||
                  prenda.ref.toLowerCase().includes(query)
                );
              }).map((prenda) => {
                const isSelected = selectedPrenda?.ref === prenda.ref;
                return (
                  <div
                    id={`catalog-item-${prenda.ref}`}
                    key={prenda.ref}
                    onClick={() => handleSelectPrenda(prenda)}
                    className={`p-2.5 border rounded-xl cursor-pointer transition-all flex flex-col justify-between text-left ${isSelected
                      ? 'border-indigo-300 bg-indigo-50/40 shadow-xs'
                      : 'border-[#E2E8F0] bg-white hover:border-slate-300 hover:shadow-xs'
                      }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 border-b border-slate-100 pb-1.5">
                        <span className="text-xs font-mono font-black uppercase tracking-wider text-indigo-700">
                          {prenda.ref}
                        </span>
                        <span className="text-[10px] font-extrabold text-slate-500 font-mono shrink-0">
                          {Array.isArray(prenda.categoria) ? prenda.categoria.join(' / ') : prenda.categoria}
                        </span>
                      </div>
                      <h4 className="text-[11px] font-bold text-slate-800 mt-2 line-clamp-2 uppercase leading-snug">
                        {prenda.nombre}
                      </h4>
                    </div>

                    <div className="mt-2.5 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-black text-[#4A5D4E] font-mono">{formatCOP(prenda.precioBase)}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewFotoPrenda(prenda);
                        }}
                        className="px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[9px] font-bold uppercase rounded border border-indigo-200/50 transition-colors flex items-center gap-1"
                        title="Ver Foto"
                      >
                        <ImageIcon className="h-3 w-3" />
                        <span>Ver foto</span>
                      </button>
                    </div>
                  </div>
                );
              })}
              {campanaGarments.length === 0 && (
                <div className="col-span-full py-8 text-center text-xs text-slate-400 italic">
                  No hay referencias habilitadas para esta campaña. Por favor configúralas en la sección de Configuración.
                </div>
              )}
            </div>
          </div>

          {/* Spec/Configuration Column (5 Cols) */}
          <div className="lg:col-span-5 bg-[#FAFBFD] border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
            {selectedPrenda ? (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-start gap-4 pb-2 border-b border-slate-100/60">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Prenda Seleccionada</span>

                      {/* Big Reference Code (REF) */}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xl font-black tracking-wide font-mono text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-lg">
                          {selectedPrenda.ref}
                        </span>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                          {Array.isArray(selectedPrenda.categoria) ? selectedPrenda.categoria.join(' / ') : selectedPrenda.categoria}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setViewFotoPrenda(selectedPrenda)}
                      className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase rounded-lg border border-indigo-200/50 transition-all flex items-center gap-1.5 shadow-3xs shrink-0"
                      title="Ver Foto de la Prenda"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      <span>Ver foto</span>
                    </button>
                  </div>

                  {/* Smaller Description (Nombre) */}
                  <h4 className="text-xs font-bold text-slate-600 mt-2 uppercase leading-normal">{selectedPrenda.nombre}</h4>

                  {/* Highlighted Unit Price box with softened shading - EDITABLE */}
                  <div className="mt-3.5 bg-gradient-to-r from-indigo-50/55 via-white to-indigo-50/55 border border-indigo-100 rounded-2xl p-4 text-center shadow-2xs">
                    <label htmlFor="input-custom-unit-price" className="text-[10px] text-indigo-600 uppercase font-extrabold tracking-widest block mb-1">
                      Precio de Lista Unitario
                    </label>
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-2xl font-black text-[#4A5D4E] font-mono">$</span>
                      <input
                        id="input-custom-unit-price"
                        type="number"
                        min="0"
                        value={customUnitPrice || ''}
                        onChange={(e) => setCustomUnitPrice(Math.max(0, parseInt(e.target.value) || 0))}
                        onFocus={(e) => e.target.select()}
                        className="w-40 text-center text-2xl font-black text-[#4A5D4E] font-mono bg-transparent border-b-2 border-dashed border-indigo-300 focus:border-indigo-500 focus:outline-none focus:ring-0 p-0"
                      />
                    </div>
                  </div>
                </div>

                {/* Talla selection */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Selecciona las Tallas
                  </label>
                  <div className="flex flex-wrap gap-1.5 items-center w-full">
                    {selectedPrenda.tallasDisponibles.map((t) => {
                      const isSelected = !!tallasCantidades[t];
                      return (
                        <button
                          id={`select-talla-${t}`}
                          key={t}
                          onFocus={(e) => e.target.select()}
                          type="button"
                          onClick={() => {
                            setTallasCantidades(prev => {
                              const copy = { ...prev };
                              delete copy['N/A'];
                              if (copy[t]) {
                                delete copy[t];
                              } else {
                                copy[t] = 1;
                              }
                              return copy;
                            });
                          }}
                          className={`h-8 min-w-[36px] px-2 text-xs font-black rounded-md border transition-all ${isSelected
                            ? 'bg-[#1E293B] border-[#1E293B] text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 shadow-xs'
                            }`}
                        >
                          {t}
                        </button>
                      );
                    })}

                    {/* Extreme right N/A button */}
                    <button
                      id="select-talla-NA"
                      type="button"
                      onClick={() => {
                        setTallasCantidades(prev => {
                          const isSelected = !!prev['N/A'];
                          if (isSelected) {
                            return {};
                          } else {
                            return { 'N/A': 1 };
                          }
                        });
                      }}
                      className={`h-8 min-w-[36px] px-2 text-xs font-black rounded-md border transition-all ml-auto ${!!tallasCantidades['N/A']
                        ? 'bg-[#1E293B] border-[#1E293B] text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 shadow-xs'
                        }`}
                    >
                      N/A
                    </button>
                  </div>

                  {/* Size quantities drawer */}
                  {Object.keys(tallasCantidades).length > 0 && (
                    <div className="mt-3.5 p-3.5 bg-indigo-50/55 border border-indigo-100 rounded-xl space-y-2 animate-in fade-in duration-150">
                      <span className="block text-[10px] font-black uppercase tracking-wider text-indigo-600">
                        Cantidad por Talla
                      </span>
                      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-0.5">
                        {Object.keys(tallasCantidades).map((t) => {
                          const isNA = t === 'N/A';
                          return (
                            <div
                              key={t}
                              className={`flex bg-white border border-slate-100 p-2.5 rounded-xl shadow-2xs ${isNA
                                  ? 'w-full flex-row justify-between items-center px-4 py-3'
                                  : 'flex-col items-center gap-1.5 min-w-[90px]'
                                }`}
                            >
                              <span className="text-[10px] font-extrabold text-slate-800 font-mono">
                                Talla {t}
                              </span>
                              <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden h-7">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTallasCantidades(prev => {
                                      const copy = { ...prev };
                                      if (copy[t] <= 1) {
                                        delete copy[t];
                                      } else {
                                        copy[t] -= 1;
                                      }
                                      return copy;
                                    });
                                  }}
                                  className="p-1 hover:bg-slate-50 text-slate-500"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <input
                                  type="number"
                                  min={1}
                                  value={tallasCantidades[t]}
                                  onChange={(e) => {
                                    const val = Math.max(1, parseInt(e.target.value) || 1);
                                    setTallasCantidades(prev => ({ ...prev, [t]: val }));
                                  }}
                                  onFocus={(e) => e.target.select()}
                                  className="w-8 text-center text-xs font-bold text-slate-700 bg-transparent border-none outline-none focus:ring-0 p-0"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTallasCantidades(prev => ({ ...prev, [t]: (prev[t] || 0) + 1 }));
                                  }}
                                  className="p-1 hover:bg-slate-50 text-slate-500"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Novedades o requerimientos */}
                <div>
                  <label htmlFor="input-item-novedad" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Novedad o Requerimiento Especial
                  </label>
                  <textarea
                    id="input-item-novedad"
                    value={novedad}
                    onChange={(e) => setNovedad(e.target.value)}
                    placeholder="Ej. Ajuste de talle, bordado especial, bota recta, etc."
                    rows={2}
                    className="w-full p-2.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                  />
                </div>

                {/* Add to cart action button */}
                <div className="pt-1">
                  <button
                    id="btn-add-to-cart"
                    type="button"
                    onClick={handleAddToCart}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase rounded-lg shadow-md transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Añadir Referencia</span>
                  </button>
                </div>

                {/* Added to cart feedback */}
                {addFeedback && (
                  <div id="add-to-cart-feedback" className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] leading-snug flex items-start gap-1.5 animate-in slide-in-from-bottom-2 duration-150">
                    <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span>{addFeedback}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 py-10">
                Selecciona una prenda de vestir del catálogo a la izquierda para configurar.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Shopping Cart List & Checkout Configuration */}
      {!selectedClientId ? (
        <div id="order-cart-locked" className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-10 text-center text-slate-500 space-y-3">
          <ShoppingBag className="h-10 w-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">Lista de prendas bloqueada</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Por favor selecciona o registra un cliente en el paso anterior para habilitar la lista de prendas del pedido.
          </p>
        </div>
      ) : (
        <div id="order-cart-panel" className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A5D4E] mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>3. Lista de Prendas en el Pedido Actual</span>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handleOpenAddExtraProductModal}
                className="text-[10px] text-emerald-600 hover:text-emerald-800 font-bold uppercase tracking-wide flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Ref. Adicional
              </button>
              {cart.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleOpenMassQtyModal}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold uppercase tracking-wide flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Modificación de tallas
                  </button>
                  <button
                    id="btn-clear-order-cart"
                    type="button"
                    onClick={handleClearCart}
                    className="text-[10px] text-red-500 hover:text-red-700 font-bold uppercase tracking-wide flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" /> Vaciar Todo
                  </button>
                </>
              )}
            </div>
          </h3>

          {cart.length === 0 ? (
            <div className="text-center p-8 border border-dashed border-slate-200 rounded-lg text-xs text-slate-400">
              Aún no has agregado ninguna prenda de vestir a este pedido. Configura una prenda en el paso 2 para agregarla.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                      <th className="pb-2">Prenda</th>
                      <th className="pb-2 text-center">Talla</th>
                      <th className="pb-2 text-center">Requerimiento / Novedad</th>
                      <th className="pb-2 text-center">Cant.</th>
                      <th className="pb-2 text-right">Precio Un.</th>
                      <th className="pb-2 text-right">Subtotal</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs">
                    {cart.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-1.5">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-1.5">
                            <span className="font-semibold text-slate-800 font-mono leading-tight">
                              {listToUse.find(p => p.ref === item.prendaRef)?.ref || item.prendaRef}
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal leading-tight">
                              <span className="hidden sm:inline">- </span>({item.categoria})
                            </span>
                          </div>
                        </td>
                        <td className="py-1.5 text-center font-bold text-slate-700">{item.talla.replace(/\s*\((\d+)\)/g, '-$1')}</td>
                        <td className="py-1.5 text-center">
                          {item.novedad ? (
                            <span className="inline-block px-2 py-1 bg-amber-50 border border-amber-100 rounded text-[10px] text-amber-800 font-medium italic max-w-[180px] truncate" title={item.novedad}>
                              {item.novedad}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal italic">-</span>
                          )}
                        </td>
                        <td className="py-1.5 text-center font-bold text-slate-800">{item.cantidad}</td>
                        <td className="py-1.5 text-right font-mono text-slate-600">{formatCOP(item.precioUnitario)}</td>
                        <td className="py-1.5 text-right font-mono font-bold text-slate-800">{formatCOP(item.total)}</td>
                        <td className="py-1.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              id={`btn-edit-cart-${item.id}`}
                              type="button"
                              onClick={() => handleOpenEditCartModal(item)}
                              className="p-1 text-slate-400 hover:text-indigo-650 rounded"
                              title="Editar fila"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              id={`btn-remove-cart-${item.id}`}
                              type="button"
                              onClick={() => handleRemoveFromCart(item.id)}
                              className="p-1 text-slate-400 hover:text-red-500 rounded"
                              title="Eliminar fila"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Extra order settings: Payments, Delivery & Dates */}
              <div className="space-y-4 pt-4 border-t border-slate-100">

                {/* Row 1: Dates (left) & Total Pedido (right) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Estimate Delivery date (Inicio) */}
                    <div>
                      <label htmlFor="input-order-delivery" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Fecha de inicio de despacho
                      </label>
                      <input
                        id="input-order-delivery"
                        type="date"
                        required
                        value={fechaEntrega}
                        onChange={(e) => setFechaEntrega(e.target.value)}
                        className="w-full p-2 border border-slate-200 bg-white rounded-md text-xs text-slate-700 focus:outline-none"
                      />
                    </div>

                    {/* Dispatch Deadline date (Fin) */}
                    <div>
                      <label htmlFor="input-order-deadline" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Fecha de fin de despacho
                      </label>
                      <input
                        id="input-order-deadline"
                        type="date"
                        value={fechaLimiteDespacho}
                        onChange={(e) => setFechaLimiteDespacho(e.target.value)}
                        className="w-full p-2 border border-slate-200 bg-white rounded-md text-xs text-slate-700 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Total Pedido: on the same row! */}
                  <div className="md:col-span-4 bg-[#FAF9F5] border border-[#E9E4D4] p-3 rounded-xl flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Pedido:</span>
                    <span className="font-mono text-[#1E293B] font-extrabold text-sm">{formatCOP(total)}</span>
                  </div>
                </div>

                {/* Row 2: Notes (left) & Action buttons (right, below the Total Pedido) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Notas adicionales del pedido - wide stretch */}
                  <div className="md:col-span-8">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Notas adicionales del pedido
                    </label>
                    <textarea
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      placeholder="Ej. Manga acortada 2cm. Empacar por separado."
                      rows={2}
                      className="w-full p-2 bg-white border border-slate-200 rounded text-xs resize-none placeholder-slate-400 focus:outline-none"
                    />
                  </div>

                  {/* Action buttons directly below Total Pedido */}
                  <div className="md:col-span-4 flex items-end gap-3 pb-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (editingPedido) {
                          onCancel();
                        } else {
                          setSelectedClientId('');
                          setClientSearchQuery('');
                          setCart([]);
                          setNotas('');
                          onCancel();
                        }
                      }}
                      className="h-[42px] px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex-1 flex items-center justify-center"
                    >
                      <span>Cancelar</span>
                    </button>
                    <button
                      id="btn-submit-order-record"
                      type="button"
                      onClick={handleSubmitOrder}
                      className="h-[42px] px-4 bg-[#4A5D4E] hover:bg-[#3C4D3F] text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition-colors flex-1 flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle className="h-4 w-4 shrink-0" />
                      <span>{editingPedido ? 'Grabar Cambios' : 'Grabar Pedido'}</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      {showBillingErrorModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200">
              <span className="text-3xl">⚠️</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Revise el porcentaje</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
              Por favor, revise el porcentaje de facturación al abrir el selector de facturación. La suma de FE y RM debe ser exactamente igual a 100%. (Suma actual: {Number(facturacionFE) + Number(facturacionRM)}%)
            </p>
            <button
              type="button"
              onClick={() => setShowBillingErrorModal(false)}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-colors cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {viewFotoPrenda && (
        <ViewFotoModal
          prenda={viewFotoPrenda}
          onClose={() => setViewFotoPrenda(null)}
        />
      )}

      {editingCartItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Editar Prenda en el Pedido</h3>
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                  Ref: {editingCartItem.prendaRef} • {editingCartItem.nombrePrenda}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingCartItem(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-650 transition-colors"
                title="Cerrar modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 overflow-y-auto pr-1 flex-1 py-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Price input */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Precio de Venta ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs font-mono">$</span>
                    <input
                      type="number"
                      min="0"
                      value={editUnitPrice}
                      onChange={(e) => setEditUnitPrice(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full pl-7 p-2.5 bg-[#FAFBFD] border border-[#CBD5E1] rounded-lg text-xs font-bold text-slate-700 focus:ring-1 focus:ring-[#4A5D4E] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Novelty input */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Requerimiento / Novedad
                  </label>
                  <input
                    type="text"
                    value={editNovedad}
                    onChange={(e) => setEditNovedad(e.target.value)}
                    placeholder="Ej. Ajuste de talle, etc."
                    className="w-full p-2.5 bg-[#FAFBFD] border border-[#CBD5E1] rounded-lg text-xs text-slate-700 focus:ring-1 focus:ring-[#4A5D4E] focus:outline-none"
                  />
                </div>
              </div>

              {/* Sizes section */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Selecciona las Tallas
                </label>
                <div className="flex flex-wrap gap-1.5 items-center w-full">
                  {(() => {
                    const prenda = listToUse.find(p => p.ref === editingCartItem.prendaRef);
                    const tallas = prenda ? (Array.isArray(prenda.tallasDisponibles) ? prenda.tallasDisponibles : []) : ['S', 'M', 'L', 'XL', 'XXL'];

                    return (
                      <>
                        {tallas.map((t) => {
                          const isSelected = editTallasCantidades[t] !== undefined && editTallasCantidades[t] > 0;
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => {
                                setEditTallasCantidades(prev => {
                                  const copy = { ...prev };
                                  delete copy['N/A'];
                                  if (copy[t]) {
                                    delete copy[t];
                                  } else {
                                    copy[t] = 1;
                                  }
                                  return copy;
                                });
                              }}
                              className={`h-8 min-w-[36px] px-2 text-xs font-black rounded-md border transition-all ${isSelected
                                  ? 'bg-[#1E293B] border-[#1E293B] text-white shadow-sm animate-scale-up'
                                  : 'bg-slate-100 border-slate-200 text-slate-400 opacity-60 hover:opacity-85'
                                }`}
                            >
                              {t}
                            </button>
                          );
                        })}

                        {/* Extreme right N/A button */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditTallasCantidades(prev => {
                              const isSelected = !!prev['N/A'];
                              if (isSelected) {
                                return {};
                              } else {
                                return { 'N/A': 1 };
                              }
                            });
                          }}
                          className={`h-8 min-w-[36px] px-2 text-xs font-black rounded-md border transition-all ml-auto ${!!editTallasCantidades['N/A']
                              ? 'bg-[#1E293B] border-[#1E293B] text-white shadow-sm'
                              : 'bg-slate-100 border-slate-200 text-slate-400 opacity-60 hover:opacity-85'
                            }`}
                        >
                          N/A
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Quantity inputs for active sizes */}
              {(() => {
                const activeSizes = Object.keys(editTallasCantidades).filter(t => editTallasCantidades[t] > 0);
                if (activeSizes.length === 0) return null;

                return (
                  <div className="mt-3.5 p-3.5 bg-indigo-50/55 border border-indigo-100 rounded-xl space-y-2">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-indigo-600">
                      Cantidad por Talla
                    </span>
                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-0.5 animate-in fade-in duration-150">
                      {activeSizes.map((t) => {
                        const isNA = t === 'N/A';
                        return (
                          <div
                            key={t}
                            className={`flex bg-white border border-slate-100 p-2.5 rounded-xl shadow-2xs animate-scale-up ${isNA
                                ? 'w-full flex-row justify-between items-center px-4 py-3'
                                : 'flex-col items-center gap-1.5 min-w-[90px]'
                              }`}
                          >
                            <span className="text-[10px] font-extrabold text-slate-800 font-mono">Talla {t}</span>
                            <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden h-7">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditTallasCantidades(prev => {
                                    const current = prev[t] || 0;
                                    if (current <= 1) {
                                      const copy = { ...prev };
                                      delete copy[t];
                                      return copy;
                                    }
                                    return { ...prev, [t]: current - 1 };
                                  });
                                }}
                                className="p-1 hover:bg-slate-50 text-slate-500"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={editTallasCantidades[t] || ''}
                                onChange={(e) => {
                                  const val = Math.max(1, parseInt(e.target.value) || 1);
                                  setEditTallasCantidades(prev => ({ ...prev, [t]: val }));
                                }}
                                onFocus={(e) => e.target.select()}
                                className="w-8 text-center text-xs font-bold text-slate-700 bg-transparent border-none outline-none focus:ring-0 p-0"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setEditTallasCantidades(prev => ({ ...prev, [t]: (prev[t] || 0) + 1 }));
                                }}
                                className="p-1 hover:bg-slate-50 text-slate-500"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-100 flex gap-3 mt-4 w-full">
              <button
                type="button"
                onClick={() => setEditingCartItem(null)}
                className="flex-1 py-2.5 border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold rounded-xl text-slate-650 transition-colors cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEditCartItem}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer text-center"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MASS QUANTITY MODAL */}
      {showMassQtyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col my-8 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#1E293B] text-white p-5 relative">
              <button
                type="button"
                onClick={() => setShowMassQtyModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <span className="px-2.5 py-0.5 bg-[#4F46E5] text-[9px] uppercase tracking-wider font-semibold rounded-full text-[#E0E7FF] mb-1 inline-block">
                Herramienta de Edición
              </span>
              <h3 className="text-md font-bold uppercase tracking-wider text-[#F8FAFC]">
                Asignación Masiva de Cantidades
              </h3>
              <p className="text-[11px] text-slate-300 mt-1">
                Aplica la misma cantidad o distribución de tallas a todas las referencias del pedido de una vez.
              </p>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-100">
              <button
                type="button"
                onClick={() => setMassQtyMode('flat')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-all border-b-2 ${massQtyMode === 'flat'
                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20'
                    : 'border-transparent text-slate-500 hover:text-slate-700 bg-slate-50/40'
                  }`}
              >
                Cantidad Fija General (Talla N/A)
              </button>
              <button
                type="button"
                onClick={() => setMassQtyMode('sizes')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-all border-b-2 ${massQtyMode === 'sizes'
                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20'
                    : 'border-transparent text-slate-500 hover:text-slate-700 bg-slate-50/40'
                  }`}
              >
                Distribución por Tallas de Categoría
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[380px] space-y-4">
              {massQtyMode === 'flat' ? (
                <div className="space-y-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">Cantidad única por prenda</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Ej. 12"
                      value={massFlatQty}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setMassFlatQty(isNaN(val) ? '' : val);
                      }}
                      className="w-full border border-slate-300 rounded-xl p-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500 bg-slate-50/50"
                    />
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2">
                    <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-800 leading-relaxed">
                      <strong>Nota:</strong> Al aplicar, todas las prendas agregadas al carrito se configurarán en la talla <strong>"N/A"</strong> con la cantidad exacta que ingreses. Se ignorarán las tallas previas y se recalcularán los valores económicos.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.keys(massSizesQty).length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400">
                      No hay categorías disponibles. Agrega prendas al carrito primero.
                    </div>
                  ) : (
                    Object.keys(massSizesQty).map(cat => {
                      const sizesForCat = massSizesQty[cat] || {};

                      return (
                        <div key={cat} className="space-y-2 border-b border-slate-100 pb-4 last:border-0 last:pb-0 animate-in fade-in duration-150">
                          <span className="px-2.5 py-0.5 bg-slate-100 text-[10px] font-extrabold uppercase rounded-md text-slate-600 tracking-wider">
                            Categoría: {cat}
                          </span>
                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
                            {Object.keys(sizesForCat).map(talla => (
                              <div key={talla} className="flex flex-col items-center bg-slate-50 border border-slate-200 rounded-xl p-2 shadow-2xs">
                                <span className="text-[10px] font-bold text-slate-500 uppercase mb-1 font-mono">{talla}</span>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={sizesForCat[talla] || ''}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    const cleanVal = isNaN(val) || val < 0 ? 0 : val;
                                    setMassSizesQty(prev => ({
                                      ...prev,
                                      [cat]: {
                                        ...prev[cat],
                                        [talla]: cleanVal
                                      }
                                    }));
                                  }}
                                  className="w-12 text-center text-xs border border-slate-200 rounded-md p-1 font-bold text-slate-800 focus:outline-none focus:border-indigo-500 bg-white"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}

                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex gap-2">
                    <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-indigo-800 leading-relaxed">
                      <strong>Filtro inteligente:</strong> Las cantidades configuradas por categoría se cruzarán con las tallas reales que soporta cada prenda. Las tallas que una prenda no admita serán omitidas en ese modelo para evitar inconsistencias de despacho. Las categorías en las que no ingreses cantidades permanecerán inalteradas.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-100 p-4 flex gap-3">
              <button
                type="button"
                onClick={() => setShowMassQtyModal(false)}
                className="flex-1 py-2.5 border border-slate-300 text-slate-700 text-xs font-bold uppercase rounded-xl transition-all hover:bg-slate-100 cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyMassQty}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase rounded-xl shadow-md transition-all cursor-pointer text-center"
              >
                Aplicar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD EXTRA PRODUCT MODAL */}
      {showAddExtraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-100 flex flex-col my-8 animate-in zoom-in-95 duration-200 max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-[#059669] text-white p-5 relative rounded-t-2xl">
              <button
                type="button"
                onClick={() => setShowAddExtraModal(false)}
                className="absolute top-4 right-4 text-emerald-200 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <span className="px-2.5 py-0.5 bg-[#10B981] text-[9px] uppercase tracking-wider font-semibold rounded-full text-white mb-1 inline-block">
                Referencia Fuera de Correría
              </span>
              <h3 className="text-md font-bold uppercase tracking-wider text-[#F8FAFC]">
                Agregar Referencia Adicional
              </h3>
              <p className="text-[11px] text-emerald-100 mt-1">
                Ingresa una referencia personalizada que no forma parte del catálogo estándar y define sus cantidades.
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* Row 1: Reference & Label */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Referencia (Ref) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 10210"
                    value={extraRef}
                    onChange={(e) => setExtraRef(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="w-full p-2.5 bg-[#FAFBFD] border border-[#CBD5E1] rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-[#059669] focus:outline-none uppercase"
                  />
                  {foundExtraPrenda && (
                    <p className="mt-1 text-[11px] font-bold text-emerald-600">
                      ✓ Prenda encontrada: {foundExtraPrenda.nombre}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Etiqueta (Categoría) *
                  </label>
                  <select
                    value={extraCategory}
                    onChange={(e) => {
                      const newCat = e.target.value as any;
                      setExtraCategory(newCat);
                      setExtraTallasCantidades({ 'N/A': 1 }); // Por defecto N/A = 1
                    }}
                    className="w-full p-2.5 bg-[#FAFBFD] border border-[#CBD5E1] rounded-lg text-xs font-bold text-slate-700 focus:ring-1 focus:ring-[#059669] focus:outline-none"
                  >
                    <option value="Dama">Dama</option>
                    <option value="Plus">Plus</option>
                    <option value="Niña">Niña</option>
                    <option value="Niño">Niño</option>
                    <option value="Colegial">Colegial</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Price & Novelty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Precio de Venta ($) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs font-mono">$</span>
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder="0"
                      value={extraUnitPrice}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setExtraUnitPrice(isNaN(val) ? '' : val);
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-full pl-7 p-2.5 bg-[#FAFBFD] border border-[#CBD5E1] rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-[#059669] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Requerimiento / Novedad
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Ajuste de prenda"
                    value={extraNovedad}
                    onChange={(e) => setExtraNovedad(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="w-full p-2.5 bg-[#FAFBFD] border border-[#CBD5E1] rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-[#059669] focus:outline-none"
                  />
                </div>
              </div>

              {/* Sizes Selector */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Selecciona las Tallas
                </label>
                <div className="flex flex-wrap gap-1.5 items-center w-full">
                  {(() => {
                    const tallas = getAvailableSizesForCategory(extraCategory);
                    return (
                      <>
                        {tallas.map((t) => {
                          const isSelected = extraTallasCantidades[t] !== undefined && extraTallasCantidades[t] > 0;
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => {
                                setExtraTallasCantidades(prev => {
                                  const copy = { ...prev };
                                  delete copy['N/A'];
                                  if (copy[t]) {
                                    delete copy[t];
                                  } else {
                                    copy[t] = 1;
                                  }
                                  return copy;
                                });
                              }}
                              className={`h-8 min-w-[36px] px-2 text-xs font-black rounded-md border transition-all ${isSelected
                                  ? 'bg-[#1E293B] border-[#1E293B] text-white shadow-sm animate-scale-up'
                                  : 'bg-slate-100 border-slate-200 text-slate-400 opacity-60 hover:opacity-85'
                                }`}
                            >
                              {t}
                            </button>
                          );
                        })}

                        {/* Extreme right N/A button */}
                        <button
                          type="button"
                          onClick={() => {
                            setExtraTallasCantidades(prev => {
                              const isSelected = !!prev['N/A'];
                              if (isSelected) {
                                return {};
                              } else {
                                return { 'N/A': 1 };
                              }
                            });
                          }}
                          className={`h-8 min-w-[36px] px-2 text-xs font-black rounded-md border transition-all ml-auto ${!!extraTallasCantidades['N/A']
                              ? 'bg-[#1E293B] border-[#1E293B] text-white shadow-sm animate-scale-up'
                              : 'bg-slate-100 border-slate-200 text-slate-400 opacity-60 hover:opacity-85'
                            }`}
                        >
                          N/A
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Quantity inputs for active sizes */}
              {(() => {
                const activeSizes = Object.keys(extraTallasCantidades).filter(t => extraTallasCantidades[t] > 0);
                if (activeSizes.length === 0) return null;

                return (
                  <div className="mt-3.5 p-3.5 bg-indigo-50/55 border border-indigo-100 rounded-xl space-y-2">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-indigo-600">
                      Cantidad por Talla
                    </span>
                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-0.5 animate-in fade-in duration-150">
                      {activeSizes.map((t) => {
                        const isNA = t === 'N/A';
                        return (
                          <div
                            key={t}
                            className={`flex bg-white border border-slate-100 p-2.5 rounded-xl shadow-2xs animate-scale-up ${isNA
                                ? 'w-full flex-row justify-between items-center px-4 py-3'
                                : 'flex-col items-center gap-1.5 min-w-[90px]'
                              }`}
                          >
                            <span className="text-[10px] font-extrabold text-slate-800 font-mono">Talla {t}</span>
                            <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden h-7">
                              <button
                                type="button"
                                onClick={() => {
                                  setExtraTallasCantidades(prev => {
                                    const current = prev[t] || 0;
                                    if (current <= 1) {
                                      const copy = { ...prev };
                                      delete copy[t];
                                      return copy;
                                    }
                                    return { ...prev, [t]: current - 1 };
                                  });
                                }}
                                className="p-1 hover:bg-slate-50 text-slate-500"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={extraTallasCantidades[t] || ''}
                                onChange={(e) => {
                                  const val = Math.max(1, parseInt(e.target.value) || 1);
                                  setExtraTallasCantidades(prev => ({ ...prev, [t]: val }));
                                }}
                                onFocus={(e) => e.target.select()}
                                className="w-8 text-center text-xs font-bold text-slate-700 bg-transparent border-none outline-none focus:ring-0 p-0"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setExtraTallasCantidades(prev => ({ ...prev, [t]: (prev[t] || 0) + 1 }));
                                }}
                                className="p-1 hover:bg-slate-50 text-slate-500"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-100 p-4 flex gap-3 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setShowAddExtraModal(false)}
                className="flex-1 py-2.5 border border-slate-300 text-slate-700 text-xs font-bold uppercase rounded-xl transition-all hover:bg-slate-100 cursor-pointer text-center bg-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveExtraItem}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase rounded-xl shadow-md transition-all cursor-pointer text-center"
              >
                Agregar al Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {showUpdateClientConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 relative overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
            <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
              ⚠️ Confirmar actualización de cliente
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              ¿Está seguro de que desea ir a actualizar los datos del cliente?
              <br />
              <strong className="text-slate-700 font-bold">
                Tenga en cuenta que al salir de esta pantalla se perderán las referencias que haya agregado en este momento en el pedido actual.
              </strong>
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowUpdateClientConfirmModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-bold uppercase rounded-xl transition-all cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUpdateClientConfirmModal(false);
                  if (onUpdateActiveClientRedirect) {
                    onUpdateActiveClientRedirect(selectedClientId);
                  }
                }}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase rounded-xl shadow-md transition-all cursor-pointer text-center"
              >
                Aceptar y Salir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
