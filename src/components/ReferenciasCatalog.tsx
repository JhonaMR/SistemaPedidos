import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { Search, Tag, Package, Sparkles, X, Image as ImageIcon, Plus, Edit2, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import { Prenda, Campana } from '../types';
import { ViewFotoModal } from './ViewFotoModal';

interface ReferenciasCatalogProps {
  prendas?: Prenda[];
  onUpdatePrendas?: (updated: Prenda[]) => void;
  currentUser?: any;
  activeCampana?: string;
  campanasReferencias?: Record<string, string[]>;
  campanasDisponibles?: Campana[];
}

export default function ReferenciasCatalog({
  prendas = [],
  onUpdatePrendas = () => { },
  currentUser,
  activeCampana,
  campanasReferencias,
  campanasDisponibles = []
}: ReferenciasCatalogProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [viewFotoPrenda, setViewFotoPrenda] = useState<Prenda | null>(null);

  const [selectedYearFilter, setSelectedYearFilter] = useState<number>(() => {
    if (activeCampana) {
      const match = activeCampana.match(/\d{4}/);
      if (match) return parseInt(match[0], 10);
    }
    return new Date().getFullYear();
  });

  const [selectedCampanaFilter, setSelectedCampanaFilter] = useState<string>(activeCampana || 'Todas');

  useEffect(() => {
    if (activeCampana) {
      setSelectedCampanaFilter(activeCampana);
      const match = activeCampana.match(/\d{4}/);
      if (match) {
        setSelectedYearFilter(parseInt(match[0], 10));
      }
    }
  }, [activeCampana]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(16);

  // Form states for adding/editing reference
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingPrenda, setEditingPrenda] = useState<Prenda | null>(null);
  const [formRef, setFormRef] = useState('');
  const [formNombre, setFormNombre] = useState('');
  const [formCategorias, setFormCategorias] = useState<('Dama' | 'Plus' | 'Niña' | 'Niño' | 'Colegial')[]>(['Dama']);
  const [formPrecio, setFormPrecio] = useState<number>(0);
  const [formTallas, setFormTallas] = useState<string[]>([]);
  const [formImagenUrl, setFormImagenUrl] = useState<string>('');

  const categories = ['Todas', 'Dama', 'Plus', 'Niña', 'Niño', 'Colegial'];

  const getAvailableSizesForCategories = (cats: string[]) => {
    let sizes: string[] = [];
    if (cats.includes('Colegial')) {
      return ['2/4', '6/8', '10/12', '14/16', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
    }
    if (cats.includes('Dama')) {
      sizes = [...sizes, 'S', 'M', 'L'];
    }
    if (cats.includes('Plus')) {
      sizes = [...sizes, 'XL', '2XL', '3XL'];
    }
    if (cats.includes('Niña') || cats.includes('Niño')) {
      sizes = [...sizes, '2/4', '6/8', '10/12', '14/16'];
    }
    const order = ['2/4', '6/8', '10/12', '14/16', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
    return order.filter(s => sizes.includes(s));
  };

  const sizesToDisplay = getAvailableSizesForCategories(formCategorias);

  useEffect(() => {
    const allowed = getAvailableSizesForCategories(formCategorias);
    setFormTallas(prev => prev.filter(t => allowed.includes(t)));
  }, [formCategorias]);

  // ESC Key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setViewFotoPrenda(null);
        setShowFormModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(val);
  };

  const filteredPrendas = prendas.filter(p => {
    // Filtrado por campaña/año
    let isEnabledInCampaign = true;
    if (selectedCampanaFilter !== 'Todas') {
      isEnabledInCampaign = !campanasReferencias ||
        !campanasReferencias[selectedCampanaFilter] ||
        campanasReferencias[selectedCampanaFilter].includes(p.ref);
    } else {
      // Si es Todas, filtramos por todas las campañas del año seleccionado
      const campanasDelAnio = (campanasDisponibles || [])
        .filter(c => c.anio === selectedYearFilter)
        .map(c => `${c.nombre} ${c.anio}`);

      if (campanasDelAnio.length > 0 && campanasReferencias) {
        isEnabledInCampaign = campanasDelAnio.some(campName =>
          campanasReferencias[campName] && campanasReferencias[campName].includes(p.ref)
        );
      }
    }

    const matchesSearch =
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.ref.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory === 'Todas' ||
      (Array.isArray(p.categoria) ? p.categoria.includes(selectedCategory as any) : p.categoria === selectedCategory);

    return isEnabledInCampaign && matchesSearch && matchesCategory;
  });

  // Reset page when search, category filter, campaign filter or itemsPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory, selectedCampanaFilter, selectedYearFilter, itemsPerPage]);

  const totalPages = Math.ceil(filteredPrendas.length / itemsPerPage);
  const paginatedPrendas = filteredPrendas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleStartAdd = () => {
    setEditingPrenda(null);
    setFormRef('');
    setFormNombre('');
    setFormCategorias(['Dama']);
    setFormPrecio(0);
    setFormTallas([]);
    setFormImagenUrl('');
    setShowFormModal(true);
  };

  const handleStartEdit = (prenda: Prenda) => {
    setEditingPrenda(prenda);
    setFormRef(prenda.ref);
    setFormNombre(prenda.nombre);
    const initialCats = Array.isArray(prenda.categoria)
      ? prenda.categoria
      : (prenda.categoria ? [prenda.categoria] : ['Dama']);
    setFormCategorias(initialCats as any);
    setFormPrecio(prenda.precioBase);
    setFormTallas(prenda.tallasDisponibles || []);
    setFormImagenUrl(prenda.imagenUrl || '');
    setShowFormModal(true);
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormImagenUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleFormTalla = (talla: string) => {
    setFormTallas(prev =>
      prev.includes(talla)
        ? prev.filter(t => t !== talla)
        : [...prev, talla]
    );
  };

  const handleSavePrenda = (e: FormEvent) => {
    e.preventDefault();
    if (!formRef.trim() || !formNombre.trim()) {
      alert('Por favor completa todos los campos requeridos.');
      return;
    }
    if (formTallas.length === 0) {
      alert('Selecciona al menos una talla disponible.');
      return;
    }

    const refUpper = formRef.trim().toUpperCase();

    if (editingPrenda) {
      // Edit existing reference
      if (editingPrenda.ref !== refUpper) {
        const isRefTaken = prendas.some(p => p.ref.toLowerCase() === refUpper.toLowerCase());
        if (isRefTaken) {
          alert('Este código de referencia ya existe.');
          return;
        }
      }
      const updatedList = prendas.map(p => p.ref === editingPrenda.ref ? {
        ref: refUpper,
        nombre: formNombre.trim(),
        categoria: formCategorias,
        precioBase: formPrecio,
        tallasDisponibles: formTallas,
        imagenUrl: formImagenUrl,
        stock: p.stock !== undefined ? p.stock : 100
      } : p);
      onUpdatePrendas(updatedList);
      alert('Referencia actualizada con éxito.');
    } else {
      // Create new reference manually
      const isRefTaken = prendas.some(p => p.ref.toLowerCase() === refUpper.toLowerCase());
      if (isRefTaken) {
        alert('Este código de referencia ya existe.');
        return;
      }

      const newPrenda: Prenda = {
        ref: refUpper,
        nombre: formNombre.trim(),
        categoria: formCategorias,
        precioBase: formPrecio,
        tallasDisponibles: formTallas,
        imagenUrl: formImagenUrl,
        stock: 100
      };
      onUpdatePrendas([newPrenda, ...prendas]);
      alert('Nueva referencia creada con éxito.');
    }

    setShowFormModal(false);
  };

  return (
    <div id="referencias-catalog-container" className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-[#E2E8F0] p-6 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Package className="h-5 w-5 text-indigo-600" />
            <span>Base de Referencias Activas</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Catálogo completo de referencias disponibles para la toma de pedidos.
          </p>
          {activeCampana && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-extrabold rounded-md uppercase tracking-wider">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-600"></span>
              </span>
              <span>Campaña: {activeCampana}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
          {currentUser?.rol === 'soporte' && (
            <button
              id="btn-create-reference"
              type="button"
              onClick={handleStartAdd}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#4A5D4E] hover:bg-[#3D4C3F] text-white text-xs font-bold rounded-lg transition-colors shadow-xs w-full md:w-auto cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Añadir Referencia</span>
            </button>
          )}

          {/* Selectores de Campaña Duplicados */}
          <div className="flex items-center justify-between md:justify-start gap-2 w-full md:w-auto bg-slate-50 p-2 md:p-0 rounded-lg md:bg-transparent">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Año:</span>
              <select
                value={selectedYearFilter}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setSelectedYearFilter(val);

                  // Seleccionar automáticamente la primera campaña de este año
                  const campaignsForYear = (campanasDisponibles || [])
                    .filter(c => c.anio === val)
                    .sort((a, b) => a.numero - b.numero);

                  if (campaignsForYear.length > 0) {
                    setSelectedCampanaFilter(`${campaignsForYear[0].nombre} ${campaignsForYear[0].anio}`);
                  } else {
                    setSelectedCampanaFilter('Todas');
                  }
                }}
                className="p-1.5 px-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-3xs hover:border-slate-300 transition-colors"
              >
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
                <option value={2028}>2028</option>
                <option value={2029}>2029</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 ml-1">Campaña:</span>
              <select
                value={selectedCampanaFilter}
                onChange={(e) => setSelectedCampanaFilter(e.target.value)}
                className="p-1.5 px-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-3xs hover:border-slate-300 transition-colors max-w-[155px] truncate"
              >
                <option value="Todas">Ver todas</option>
                {(campanasDisponibles || [])
                  .filter(c => c.anio === selectedYearFilter)
                  .sort((a, b) => a.numero - b.numero)
                  .map((c) => (
                    <option key={`${c.nombre} ${c.anio}`} value={`${c.nombre} ${c.anio}`} title={`${c.nombre} ${c.anio}`}>
                      {c.nombre} {c.anio}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-800 font-bold px-4 py-2 rounded-xl flex items-center justify-center md:justify-start gap-1.5 w-full md:w-auto shrink-0">
            <Sparkles className="h-4 w-4" />
            <span>{filteredPrendas.length} Referencias Disponibles</span>
          </div>
        </div>
      </div>
      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por referencia o nombre de prenda..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-[#CBD5E1] rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto shrink-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedCategory === cat
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Garments */}
      {filteredPrendas.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-xl p-12 text-center text-slate-400 text-xs">
          No se encontraron referencias que coincidan con la búsqueda.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {paginatedPrendas.map((prenda) => (
              <div
                key={prenda.ref}
                className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between space-y-3 relative text-left"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-[9px] text-indigo-700 font-extrabold uppercase rounded border border-indigo-100">
                      <Tag className="h-3 w-3" />
                      {Array.isArray(prenda.categoria) ? prenda.categoria.join(' / ') : prenda.categoria}
                    </span>
                    <span className="text-[10px] font-black font-mono text-slate-800 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded tracking-wide">
                      {prenda.ref}
                    </span>
                  </div>
                  <h3 className="text-xs font-black text-slate-900 leading-tight line-clamp-1" title={prenda.nombre}>
                    {prenda.nombre}
                  </h3>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">Precio Lista</span>
                    <span className="font-extrabold text-indigo-600 font-mono">{formatCOP(prenda.precioBase)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-1.5 pt-1">
                    <div className="flex flex-wrap gap-0.5 max-w-[100px]">
                      {prenda.tallasDisponibles.map((t) => (
                        <span
                          key={t}
                          className="px-1 py-0.5 bg-slate-50 border border-slate-200 rounded text-[8px] font-extrabold text-slate-500 font-mono"
                        >
                          {t}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setViewFotoPrenda(prenda)}
                        className="px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[9px] font-bold uppercase rounded border border-indigo-200/50 transition-colors flex items-center gap-1"
                        title="Ver Foto"
                      >
                        <ImageIcon className="h-3 w-3" />
                        <span>Foto</span>
                      </button>
                      {currentUser?.rol === 'soporte' && (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(prenda)}
                          className="px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[9px] font-bold uppercase rounded border border-emerald-200/50 transition-colors flex items-center gap-1"
                          title="Editar Referencia"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Editar</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Styled Premium Pagination Box */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Mostrar:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-3xs hover:border-slate-300 transition-colors"
                >
                  <option value={8}>8 por pág.</option>
                  <option value={16}>16 por pág.</option>
                  <option value={32}>32 por pág.</option>
                  <option value={64}>64 por pág.</option>
                </select>
              </div>
              <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
              <span className="text-[11px] text-slate-400">
                Total: <span className="font-bold text-slate-700">{filteredPrendas.length}</span> referencias
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
        </div>
      )}

      {/* Ver Foto Modal */}
      {viewFotoPrenda && (
        <ViewFotoModal
          prenda={viewFotoPrenda}
          onClose={() => setViewFotoPrenda(null)}
        />
      )}

      {/* Manual Creation / Editing Modal Form */}
      {showFormModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setShowFormModal(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <Package className="h-5 w-5 text-indigo-600" />
                  <span>{editingPrenda ? 'Editar Referencia' : 'Registrar Nueva Referencia'}</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Registra manualmente o modifica una prenda en el catálogo del taller.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Scroll Container */}
            <form onSubmit={handleSavePrenda} className="space-y-4 py-4 overflow-y-auto pr-1 flex-1 text-xs">

              <div className="grid grid-cols-2 gap-4">
                {/* REF */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Código de Referencia *
                  </label>
                  <input
                    type="text"
                    required
                    value={formRef}
                    onChange={(e) => setFormRef(e.target.value)}
                    placeholder="Ej. REF-009"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Categorías / Etiquetas (Máximo 2) */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Etiquetas (Máximo 2) *
                  </label>
                  <div className="grid grid-cols-5 gap-0.5 bg-slate-50 p-0.5 rounded-lg border border-slate-200">
                    {(['Dama', 'Plus', 'Niña', 'Niño', 'Colegial'] as const).map((cat) => {
                      const isSelected = formCategorias.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setFormCategorias(prev => {
                              if (prev.includes(cat)) {
                                if (prev.length === 1) return prev;
                                return prev.filter(c => c !== cat);
                              } else {
                                if (prev.length >= 2) {
                                  alert('Solo puedes elegir hasta dos etiquetas.');
                                  return prev;
                                }
                                return [...prev, cat];
                              }
                            });
                          }}
                          className={`py-1.5 px-0.5 rounded-md border text-center font-bold text-[8px] sm:text-[9px] md:text-[10px] lg:text-[11px] truncate transition-all ${isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Nombre de la Prenda *
                </label>
                <input
                  type="text"
                  required
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder="Ej. Blusa de Lino Manga Sisa"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Precio Base */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Precio de Venta (COP) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formPrecio || ''}
                  onChange={(e) => setFormPrecio(parseInt(e.target.value) || 0)}
                  placeholder="Ej. 45000"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Tallas Checkboxes */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Tallas Disponibles *
                </label>
                {sizesToDisplay.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">Por favor selecciona al menos una etiqueta primero.</p>
                ) : (
                  <div className="grid grid-cols-5 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {sizesToDisplay.map((t) => {
                      const isSelected = formTallas.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => toggleFormTalla(t)}
                          className={`py-1.5 px-1 rounded-md border text-center font-mono font-black text-[10px] transition-all ${isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Foto Upload */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Carga Foto desde el Equipo
                </label>
                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="h-12 w-12 rounded-lg bg-slate-200 border border-slate-300 overflow-hidden shrink-0 flex items-center justify-center text-slate-400">
                    {formImagenUrl ? (
                      <img
                        src={formImagenUrl}
                        alt="Preview"
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="input-prenda-photo-upload"
                    />
                    <label
                      htmlFor="input-prenda-photo-upload"
                      className="cursor-pointer py-1.5 px-3 border border-slate-300 rounded-lg text-[10px] bg-white hover:bg-slate-50 transition-colors flex items-center gap-1 font-bold text-slate-600 inline-flex"
                    >
                      <Upload className="h-3 w-3" />
                      <span>{formImagenUrl ? 'Cambiar Foto' : 'Subir Foto'}</span>
                    </label>
                    <p className="text-[9px] text-slate-400">Archivos JPG, PNG. Máximo 2MB.</p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end gap-2.5 -mx-6 -mb-4 pt-4 shrink-0 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold rounded-lg text-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4A5D4E] hover:bg-[#3D4C3F] text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                >
                  {editingPrenda ? 'Guardar Cambios' : 'Registrar Referencia'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
