'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import RequireAuth from '@/components/RequireAuth';
import Card from '@/components/Card';
import PageTitle from '@/components/PageTitle';
import Button from '@/components/Button';
import { authService } from '@/lib/authService';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

// Result code groups
const NETGIRO_SUCCESS = new Set([10200]);
const NETGIRO_PENDING = new Set([10425, 10426, 10428, 10429]);
const NETGIRO_DECLINED = new Set([10302, 10307, 10422, 10423]);
const NETGIRO_CANCELLED = new Set([10201, 10202]);

type ResultStatus = 'success' | 'pending' | 'declined' | 'cancelled' | 'error';

function getResultStatus(code: number): ResultStatus {
  if (NETGIRO_SUCCESS.has(code)) return 'success';
  if (NETGIRO_PENDING.has(code)) return 'pending';
  if (NETGIRO_DECLINED.has(code)) return 'declined';
  if (NETGIRO_CANCELLED.has(code)) return 'cancelled';
  return 'error';
}

function getResultMessage(status: ResultStatus, message?: string | null): string {
  switch (status) {
    case 'success':
      return 'Greiðsla tókst!';
    case 'pending':
      return 'Greiðsla í vinnslu. Vinsamlegast bíðið.';
    case 'declined':
      return 'Greiðslu hafnað.';
    case 'cancelled':
      return 'Greiðslu hætt við.';
    case 'error':
    default:
      return message || 'Villa kom upp við greiðslu.';
  }
}

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

interface InitPaymentResponse {
  TransactionId: string;
  RemoteConfirmationAvailable: boolean;
  AnnouncementMessage: string | null;
  ProcessCartCheckIntervalMiliseconds: number;
  Success: boolean;
  Message: string | null;
  ResultCode: number;
}

interface ConfirmPaymentResponse {
  PaymentSuccessful: boolean;
  PaymentInfo: {
    TransactionId: string;
    InvoiceNumber: number;
    ReferenceNumber: string;
    StatusId: number;
    Created: string;
    TotalAmount: number;
    DiscountAmount: number;
    ShippingAmount: number;
    HandlingAmount: number;
    AccountNumber: number;
    NumberOfInstallments: number;
    ClientIdentityConfirmed: boolean;
    LocationId: string | null;
    RegisterId: string | null;
  } | null;
  Success: boolean;
  Message: string | null;
  ResultCode: number;
}

type ViewFilter = 'all' | 'unpaid' | 'paid';
type PaymentStep = 'select' | 'enterCustomerId' | 'enterCode' | 'result';

function formatDateTime(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function formatAmount(amount: string): string {
  const num = parseFloat(amount);
  return num.toLocaleString('is-IS', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' kr.';
}

export default function NetgiroPayment() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [viewFilter, setViewFilter] = useState<ViewFilter>('unpaid');
  const [showInactive, setShowInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Payment flow state
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('select');
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [customerId, setCustomerId] = useState('');
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<{ status: ResultStatus; message: string } | null>(null);

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

      const url = `${API_BASE}/api/purchase_order/?${params.toString()}`;
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

  const selectOrder = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setPaymentStep('enterCustomerId');
    setCustomerId('');
    setTransactionId(null);
    setConfirmationCode('');
    setPaymentError(null);
    setPaymentResult(null);
  };

  const cancelPayment = () => {
    setPaymentStep('select');
    setSelectedOrder(null);
    setCustomerId('');
    setTransactionId(null);
    setConfirmationCode('');
    setPaymentError(null);
    setPaymentResult(null);
  };

  const initiatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !customerId.trim()) return;

    setPaymentLoading(true);
    setPaymentError(null);

    try {
      const token = await authService.getToken();
      const res = await fetch(`${API_BASE}/api/netgiro/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerid: customerId.trim(),
          purchase_id: selectedOrder.id,
        }),
      });

      const data: InitPaymentResponse = await res.json();

      if (data.ResultCode !== 200 || !data.Success) {
        throw new Error(data.Message || `Villa: ${data.ResultCode}`);
      }

      setTransactionId(data.TransactionId);
      setPaymentStep('enterCode');
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Villa við að hefja greiðslu');
    } finally {
      setPaymentLoading(false);
    }
  };

  const confirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionId || !confirmationCode.trim()) return;

    setPaymentLoading(true);
    setPaymentError(null);

    try {
      const token = await authService.getToken();
      const res = await fetch(`${API_BASE}/api/netgiro/`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentref: transactionId,
          identifier: confirmationCode.trim(),
        }),
      });

      const data: ConfirmPaymentResponse = await res.json();
      const status = getResultStatus(data.ResultCode);
      const message = getResultMessage(status, data.Message);

      setPaymentResult({ status, message });
      setPaymentStep('result');

      // Refresh orders list if payment was successful
      if (status === 'success') {
        fetchOrders(searchTerm.length >= 3 ? searchTerm : undefined);
      }
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Villa við að staðfesta greiðslu');
    } finally {
      setPaymentLoading(false);
    }
  };

  const getResultColorClasses = (status: ResultStatus): string => {
    switch (status) {
      case 'success':
        return 'bg-green-100 border-green-400 text-green-800';
      case 'pending':
        return 'bg-yellow-100 border-yellow-400 text-yellow-800';
      case 'declined':
      case 'cancelled':
      case 'error':
      default:
        return 'bg-red-100 border-red-400 text-red-800';
    }
  };

  return (
    <RequireAuth>
      <div className="max-w-screen-xl mx-auto p-4">
        <PageTitle>Netgíró greiðsla</PageTitle>

        {/* Payment Modal/Flow */}
        {paymentStep !== 'select' && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                {/* Order summary */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">Pöntun #{selectedOrder.id}</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    {selectedOrder.article_name && (
                      <p><span className="font-medium">Vara:</span> {selectedOrder.article_name}</p>
                    )}
                    {selectedOrder.article_no && (
                      <p><span className="font-medium">Vörunúmer:</span> {selectedOrder.article_no}</p>
                    )}
                    <p className="text-lg font-semibold text-gray-900 mt-2">
                      Upphæð: {formatAmount(selectedOrder.amount)}
                    </p>
                  </div>
                </div>

                {/* Step: Enter Customer ID */}
                {paymentStep === 'enterCustomerId' && (
                  <form onSubmit={initiatePayment}>
                    <h2 className="text-xl font-semibold text-[#4A5459] mb-4">
                      Hefja greiðslu
                    </h2>

                    {paymentError && (
                      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {paymentError}
                      </div>
                    )}

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Auðkenni greiðanda
                      </label>
                      <input
                        type="text"
                        value={customerId}
                        onChange={e => setCustomerId(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 shadow-sm text-sm focus:ring-2 focus:ring-[#4A5459] focus:border-[#4A5459]"
                        placeholder="Sláðu inn auðkenni"
                        required
                        autoFocus
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Kennitala, símanúmer eða app kóði
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button type="submit" disabled={paymentLoading || !customerId.trim()}>
                        {paymentLoading ? 'Hleð...' : 'Halda áfram'}
                      </Button>
                      <Button type="button" variant="secondary" onClick={cancelPayment}>
                        Hætta við
                      </Button>
                    </div>
                  </form>
                )}

                {/* Step: Enter Confirmation Code */}
                {paymentStep === 'enterCode' && (
                  <form onSubmit={confirmPayment}>
                    <h2 className="text-xl font-semibold text-[#4A5459] mb-4">
                      Staðfesta greiðslu
                    </h2>

                    {paymentError && (
                      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {paymentError}
                      </div>
                    )}

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vinsamlegast sláðu inn kóðann sem þú fékkst
                      </label>
                      <input
                        type="text"
                        value={confirmationCode}
                        onChange={e => setConfirmationCode(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 shadow-sm text-sm focus:ring-2 focus:ring-[#4A5459] focus:border-[#4A5459]"
                        placeholder="Sláðu inn kóða"
                        required
                        autoFocus
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Kóði úr SMS, tölvupósti, eða appi
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button type="submit" disabled={paymentLoading || !confirmationCode.trim()}>
                        {paymentLoading ? 'Hleð...' : 'Staðfesta greiðslu'}
                      </Button>
                      <Button type="button" variant="secondary" onClick={cancelPayment}>
                        Hætta við
                      </Button>
                    </div>
                  </form>
                )}

                {/* Step: Result */}
                {paymentStep === 'result' && paymentResult && (
                  <div>
                    <h2 className="text-xl font-semibold text-[#4A5459] mb-4">
                      Niðurstaða
                    </h2>

                    <div className={`border px-4 py-3 rounded mb-6 ${getResultColorClasses(paymentResult.status)}`}>
                      <p className="font-medium">{paymentResult.message}</p>
                    </div>

                    <Button onClick={cancelPayment}>
                      Loka
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-4 items-end">
          <div className="flex flex-col">
            <label className="text-sm text-gray-700 mb-1">Leit</label>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Leita í vörum (3+ stafir)..."
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
                    <th className="text-left p-3 font-medium text-gray-700">Vörunúmer</th>
                    <th className="text-left p-3 font-medium text-gray-700">Vöruheiti</th>
                    <th className="text-left p-3 font-medium text-gray-700">Lýsing</th>
                    <th className="text-right p-3 font-medium text-gray-700">Upphæð</th>
                    <th className="text-left p-3 font-medium text-gray-700">Stofnað</th>
                    <th className="text-left p-3 font-medium text-gray-700">Rennur út</th>
                    <th className="text-center p-3 font-medium text-gray-700">Staða</th>
                    <th className="text-center p-3 font-medium text-gray-700">Aðgerð</th>
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
                      <td className="p-3">{order.article_no || '-'}</td>
                      <td className="p-3">{order.article_name || '-'}</td>
                      <td className="p-3 max-w-xs truncate" title={order.article_descr || ''}>
                        {order.article_descr || '-'}
                      </td>
                      <td className="p-3 text-right font-medium">{formatAmount(order.amount)}</td>
                      <td className="p-3 text-gray-600">{formatDateTime(order.created_at)}</td>
                      <td className="p-3 text-gray-600">{formatDateTime(order.expires_at)}</td>
                      <td className="p-3 text-center">
                        {order.is_paid ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Greitt
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Ógreitt
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {!order.is_paid && order.is_active && (
                          <button
                            onClick={() => selectOrder(order)}
                            className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium"
                          >
                            Greiða
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </RequireAuth>
  );
}
