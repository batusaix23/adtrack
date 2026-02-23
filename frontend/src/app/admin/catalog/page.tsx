'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import axios from 'axios';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  TagIcon,
  CubeIcon,
  WrenchScrewdriverIcon,
  BeakerIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface ServiceItem {
  id: string;
  name: string;
  description: string;
  item_type: string;
  category: string;
  base_price: string;
  unit: string;
  tax_rate: string;
  is_active: boolean;
}

const itemTypes = [
  { value: 'service', label: 'Servicio', labelEn: 'Service', icon: WrenchScrewdriverIcon },
  { value: 'product', label: 'Producto', labelEn: 'Product', icon: BeakerIcon },
  { value: 'part', label: 'Parte/Repuesto', labelEn: 'Part', icon: CubeIcon },
  { value: 'other', label: 'Otro', labelEn: 'Other', icon: TagIcon },
];

export default function CatalogPage() {
  const { t, language } = useLanguage();
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    itemType: 'service',
    category: '',
    basePrice: '',
    unit: 'unit',
    taxRate: '0',
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, [typeFilter, categoryFilter]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchItems = async () => {
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.append('type', typeFilter);
      if (categoryFilter) params.append('category', categoryFilter);

      const res = await axios.get(`${apiUrl}/service-items?${params}`, getAuthHeaders());
      setItems(res.data.items || []);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${apiUrl}/service-items/categories`, getAuthHeaders());
      setCategories(res.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await axios.put(`${apiUrl}/service-items/${editingItem.id}`, formData, getAuthHeaders());
      } else {
        await axios.post(`${apiUrl}/service-items`, formData, getAuthHeaders());
      }
      setShowModal(false);
      resetForm();
      fetchItems();
      fetchCategories();
    } catch (error) {
      console.error('Error saving item:', error);
    }
  };

  const handleEdit = (item: ServiceItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      itemType: item.item_type,
      category: item.category || '',
      basePrice: item.base_price,
      unit: item.unit || 'unit',
      taxRate: item.tax_rate || '0',
    });
    setShowModal(true);
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm(language === 'es' ? '¿Eliminar este item?' : 'Delete this item?')) return;
    try {
      await axios.delete(`${apiUrl}/service-items/${itemId}`, getAuthHeaders());
      fetchItems();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      itemType: 'service',
      category: '',
      basePrice: '',
      unit: 'unit',
      taxRate: '0',
    });
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount));
  };

  const getTypeIcon = (type: string) => {
    const found = itemTypes.find(t => t.value === type);
    return found ? found.icon : TagIcon;
  };

  const getTypeLabel = (type: string) => {
    const found = itemTypes.find(t => t.value === type);
    return found ? (language === 'es' ? found.label : found.labelEn) : type;
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {language === 'es' ? 'Catálogo de Items' : 'Items Catalog'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {language === 'es' ? 'Servicios, productos y partes disponibles' : 'Available services, products, and parts'}
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <PlusIcon className="h-5 w-5" />
          {language === 'es' ? 'Nuevo Item' : 'New Item'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder={language === 'es' ? 'Buscar items...' : 'Search items...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          <option value="">{language === 'es' ? 'Todos los tipos' : 'All types'}</option>
          {itemTypes.map(type => (
            <option key={type.value} value={type.value}>
              {language === 'es' ? type.label : type.labelEn}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          <option value="">{language === 'es' ? 'Todas las categorías' : 'All categories'}</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map(item => {
          const TypeIcon = getTypeIcon(item.item_type);
          return (
            <div
              key={item.id}
              className={`bg-white rounded-xl shadow-sm border p-4 ${!item.is_active ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <TypeIcon className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-500">{getTypeLabel(item.item_type)}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-1 text-gray-400 hover:text-primary-600"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {item.description && (
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{item.description}</p>
              )}

              <div className="mt-3 flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold text-primary-600">
                    {formatCurrency(item.base_price)}
                  </p>
                  <p className="text-xs text-gray-400">/ {item.unit}</p>
                </div>
                {item.category && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                    {item.category}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <CubeIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {language === 'es' ? 'No hay items en el catálogo' : 'No items in catalog'}
          </p>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            {language === 'es' ? 'Crear primer item' : 'Create first item'}
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                {editingItem
                  ? (language === 'es' ? 'Editar Item' : 'Edit Item')
                  : (language === 'es' ? 'Nuevo Item' : 'New Item')}
              </h2>
              <button onClick={() => { setShowModal(false); resetForm(); }}>
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'es' ? 'Nombre' : 'Name'} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'es' ? 'Descripción' : 'Description'}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {language === 'es' ? 'Tipo' : 'Type'}
                  </label>
                  <select
                    value={formData.itemType}
                    onChange={(e) => setFormData({ ...formData, itemType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    {itemTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {language === 'es' ? type.label : type.labelEn}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {language === 'es' ? 'Categoría' : 'Category'}
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder={language === 'es' ? 'ej: Limpieza' : 'e.g: Cleaning'}
                    list="categories-list"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <datalist id="categories-list">
                    {categories.map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {language === 'es' ? 'Precio Base' : 'Base Price'} *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {language === 'es' ? 'Unidad' : 'Unit'}
                  </label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="unit, hour, lb"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {language === 'es' ? 'Impuesto %' : 'Tax %'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
