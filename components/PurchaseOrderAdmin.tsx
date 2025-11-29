'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import RequireAuth from '@/components/RequireAuth';
import Card from '@/components/Card';
import PageTitle from '@/components/PageTitle';
import Button from '@/components/Button';
import { authService } from '@/lib/authService';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

interface PurchaseOrder {
  id: number;
  user: number;
  amount: string;
  created_at: string | null;
  expires_at: string | null;
  article_no: string | null;
  article_name: string | null;
  article_descr: string | null;
  reference: string | null;
  is_active: boolean | null;
  paid_at: string | null;
  is_paid: boolean;
}

interface PurchaseOrderFormData {
  user: number | '';
  amount: string;
  article_no: string;
  article_name: string;
  article_descr: string;
  reference: string;
  is_active: boolean;
}

const emptyFormData: PurchaseOrderFormData = {
  user: '',
  amount: '',
  article_no: '',
  article_name: '',
  article_descr: '',
  reference: '',
  is_active: true,
};

type ViewFilter = 'all' | 'unpaid' | 'paid';

function formatDateTime(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function formatAmount(amount: string): string {
  const num = parseFloat(amount);
  return num.toLocaleString('is-IS', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' kr.';
}

export default function PurchaseOrderAdmin() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [formData, setFormData] = useState<PurchaseOrderFormData>(emptyFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Debounce ref
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchOrders = useCallback(async (search?: string) => {
    setLoading(true);
    setError(null);

    try {
      const token = await authService.getToken();
      const params = new URLSearchParams();

      if (viewFilter !== 'all') {
        params.append('view', viewFilter);
      }

      if (showInactive) {
        params.append('inactive', 'true');
      }

      if (search && search.length >= 3) {
        params.append('leitarord', search);
      }

      const url = `${API_BASE}/api/purchase_order_admin?${params.toString()}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Villa: ${res.status}`);
      }

      const data = await res.json();
      setOrders(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Villa við að sækja gögn');
    } finally {
      setLoading(false);
    }
  }, [viewFilter, showInactive]);

  // Fetch on filter changes
  useEffect(() => {
    fetchOrders(searchTerm.length >= 3 ? searchTerm : undefined);
  }, [viewFilter, showInactive, fetchOrders]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchTerm.length >= 3 || searchTerm.length === 0) {
      debounceRef.current = setTimeout(() => {
        fetchOrders(searchTerm.length >= 3 ? searchTerm : undefined);
      }, 250);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm, fetchOrders]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const openCreateModal = () => {
    setEditingOrder(null);
    setFormData(emptyFormData);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (order: PurchaseOrder) => {
    setEditingOrder(order);
    setFormData({
      user: order.user,
      amount: order.amount,
      article_no: order.article_no || '',
      article_name: order.article_name || '',
      article_descr: order.article_descr || '',
      reference: order.reference || '',
      is_active: order.is_active ?? true,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingOrder(null);
    setFormData(emptyFormData);
    setFormError(null);
  };

  const handleFormChange = (field: keyof PurchaseOrderFormData, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      const token = await authService.getToken();
      const isEdit = editingOrder !== null;
      const url = isEdit
        ? `${API_BASE}/api/purchase_order_admin/${editingOrder.id}/`
        : `${API_BASE}/api/purchase_order_admin/`;

      const payload = {
        user: formData.user,
        amount: formData.amount,
        article_no: formData.article_no || null,
        article_name: formData.article_name || null,
        article_descr: formData.article_descr || null,
        reference: formData.reference || null,
        is_active: formData.is_active,
      };

      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Villa: ${res.status}`);
      }

      closeModal();
      fetchOrders(searchTerm.length >= 3 ? searchTerm : undefined);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Villa við að vista');
    } finally {
      setSaving(false);
    }
  };

  return (
    <RequireAuth>
      <div className="max-w-screen-xl mx-auto p-4">
        <PageTitle>Innkaupapantanir</PageTitle>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-4 items-end">
          <div className="flex flex-col">
            <label className="text-sm text-gray-700 mb-1">Leit</label>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Leita (3+ stafir)..."
              className="border border-gray-300 rounded px-3 py-2 shadow-sm text-sm w-64"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-gray-700 mb-1">Sýna</label>
            <select
              value={viewFilter}
              onChange={e => setViewFilter(e.target.value as ViewFilter)}
              className="border border-gray-300 rounded px-3 py-2 shadow-sm text-sm"
            >
              <option value="all">Allar</option>
              <option value="unpaid">Ógreiddar</option>
              <option value="paid">Greiddar</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showInactive"
              checked={showInactive}
              onChange={e => setShowInactive(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="showInactive" className="text-sm text-gray-700">
              Sýna óvirkar
            </label>
          </div>

          <div className="ml-auto">
            <Button onClick={openCreateModal}>
              + Ný pöntun
            </Button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Table */}
        <Card className="p-0 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Hleð...</div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Engar pantanir fundust</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="text-left p-3 font-medium text-gray-700">ID</th>
                    <th className="text-left p-3 font-medium text-gray-700">Notandi</th>
                    <th className="text-left p-3 font-medium text-gray-700">Vörunúmer</th>
                    <th className="text-left p-3 font-medium text-gray-700">Vöruheiti</th>
                    <th className="text-right p-3 font-medium text-gray-700">Upphæð</th>
                    <th className="text-left p-3 font-medium text-gray-700">Stofnað</th>
                    <th className="text-left p-3 font-medium text-gray-700">Rennur út</th>
                    <th className="text-center p-3 font-medium text-gray-700">Greitt</th>
                    <th className="text-center p-3 font-medium text-gray-700">Virk</th>
                    <th className="text-center p-3 font-medium text-gray-700">Aðgerðir</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, index) => (
                    <tr
                      key={order.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      } ${!order.is_active ? 'opacity-60' : ''}`}
                    >
                      <td className="p-3">{order.id}</td>
                      <td className="p-3">{order.user}</td>
                      <td className="p-3">{order.article_no || '-'}</td>
                      <td className="p-3">{order.article_name || '-'}</td>
                      <td className="p-3 text-right font-medium">{formatAmount(order.amount)}</td>
                      <td className="p-3 text-gray-600">{formatDateTime(order.created_at)}</td>
                      <td className="p-3 text-gray-600">{formatDateTime(order.expires_at)}</td>
                      <td className="p-3 text-center">
                        {order.is_paid ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {formatDateTime(order.paid_at)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Nei
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {order.is_active ? (
                          <span className="text-green-600">Já</span>
                        ) : (
                          <span className="text-red-600">Nei</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => openEditModal(order)}
                          className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                        >
                          Breyta
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Create/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-[#4A5459] mb-4">
                  {editingOrder ? 'Breyta pöntun' : 'Ný pöntun'}
                </h2>

                {formError && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {formError}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notandi (ID) *
                    </label>
                    <input
                      type="number"
                      value={formData.user}
                      onChange={e => handleFormChange('user', e.target.value ? parseInt(e.target.value) : '')}
                      className="w-full border border-gray-300 rounded px-3 py-2 shadow-sm text-sm focus:ring-2 focus:ring-[#4A5459] focus:border-[#4A5459]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Upphæð *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={e => handleFormChange('amount', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 shadow-sm text-sm focus:ring-2 focus:ring-[#4A5459] focus:border-[#4A5459]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vörunúmer
                    </label>
                    <input
                      type="text"
                      value={formData.article_no}
                      onChange={e => handleFormChange('article_no', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 shadow-sm text-sm focus:ring-2 focus:ring-[#4A5459] focus:border-[#4A5459]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vöruheiti
                    </label>
                    <input
                      type="text"
                      value={formData.article_name}
                      onChange={e => handleFormChange('article_name', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 shadow-sm text-sm focus:ring-2 focus:ring-[#4A5459] focus:border-[#4A5459]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vörulýsing
                    </label>
                    <textarea
                      value={formData.article_descr}
                      onChange={e => handleFormChange('article_descr', e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 rounded px-3 py-2 shadow-sm text-sm focus:ring-2 focus:ring-[#4A5459] focus:border-[#4A5459]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tilvísun
                    </label>
                    <input
                      type="text"
                      value={formData.reference}
                      onChange={e => handleFormChange('reference', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 shadow-sm text-sm focus:ring-2 focus:ring-[#4A5459] focus:border-[#4A5459]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={e => handleFormChange('is_active', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="is_active" className="text-sm text-gray-700">
                      Virk pöntun
                    </label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="submit" disabled={saving}>
                      {saving ? 'Vista...' : 'Vista'}
                    </Button>
                    <Button type="button" variant="secondary" onClick={closeModal}>
                      Hætta við
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
