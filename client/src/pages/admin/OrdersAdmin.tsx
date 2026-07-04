import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useReactToPrint } from 'react-to-print';
import {Printer, Trash2, X} from 'lucide-react';
import { api } from '../../lib/api';
import { Order } from '../../lib/types';
import { shekel, STATUS_LABELS, STATUS_COLORS, DELIVERY } from '../../lib/format';
import { Logo } from '../../components/Logo';

const STATUSES = ['pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled'] as const;

export function OrdersAdmin() {
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<Order | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', filter],
    queryFn: async () => (await api.get(`/admin/orders${filter ? `?status=${filter}` : ''}`)).data,
  });
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/orders/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-orders'] }),
  });
  const qc = useQueryClient(); // add this too if not already there

  return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">الطلبات</h1>

        <div className="mb-4 flex flex-wrap gap-2">
          <button onClick={() => setFilter('')} className={chip(filter === '')}>الكل</button>
          {STATUSES.map((s) => (
              <button key={s} onClick={() => setFilter(s)} className={chip(filter === s)}>
                {STATUS_LABELS[s]}
              </button>
          ))}
        </div>

        {isLoading ? (
            <div className="py-12 text-center text-muted">جارٍ التحميل…</div>
        ) : (
            <div className="overflow-x-auto rounded-2xl border border-line bg-white">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-surface text-muted">
                <tr>
                  <th className="p-3 text-right font-medium">رقم الطلب</th>
                  <th className="p-3 text-right font-medium">العميل</th>
                  <th className="p-3 text-right font-medium">الهاتف</th>
                  <th className="p-3 text-right font-medium">المنطقة</th>
                  <th className="p-3 text-right font-medium">الإجمالي</th>
                  <th className="p-3 text-right font-medium">الحالة</th>
                  <th className="w-16 p-3 font-medium"></th>
                </tr>
                </thead>
                <tbody>
                {data?.data?.map((o: Order) => (
                    <tr
                        key={o._id}
                        className="cursor-pointer border-b border-line last:border-0 hover:bg-surface"
                        onClick={() => setSelected(o)}
                    >
                      <td className="p-3 text-right">
                        <span className="nums font-semibold">{o.orderNumber}</span>
                      </td>
                      <td className="p-3 text-right font-medium">{o.customerName}</td>
                      <td className="p-3 text-right">
                        <span className="nums text-muted">{o.phone}</span>
                      </td>
                      <td className="p-3 text-right">{DELIVERY[o.deliveryZone].label}</td>
                      <td className="p-3 text-right">
                        <span className="nums font-semibold">{shekel(o.total)}</span>
                      </td>
                      <td className="p-3 text-right">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[o.status]}`}>
                          {STATUS_LABELS[o.status]}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                            className="rounded-lg p-2 text-destructive hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`حذف الطلب "${o.orderNumber}"؟`)) del.mutate(o._id);
                            }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                ))}
                {data?.data?.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-muted">لا توجد طلبات.</td>
                    </tr>
                )}
                </tbody>
              </table>
            </div>
        )}

        {selected && <OrderModal order={selected} onClose={() => setSelected(null)} />}
      </div>
  );
}

function chip(active: boolean) {
  return `rounded-full px-4 py-1.5 text-sm font-medium transition ${active ? 'bg-charcoal text-white' : 'border border-line hover:bg-surface'}`;
}

function OrderModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const qc = useQueryClient();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const print = useReactToPrint({ contentRef: invoiceRef, documentTitle: order.orderNumber });

  const updateStatus = useMutation({
    mutationFn: (status: string) => api.patch(`/admin/orders/${order._id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      onClose();
    },
  });

  return (
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-charcoal/40 p-4">
        <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
          {/* Header */}
          <div className="no-print mb-4 flex items-center justify-between">
            <h2 className="nums text-lg font-bold">{order.orderNumber}</h2>
            <div className="flex gap-2">
              <button className="btn-ghost" onClick={() => print()}>
                <Printer size={16} /> طباعة الفاتورة
              </button>
              <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-surface">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Printable invoice */}
          <div id="invoice" ref={invoiceRef} className="rounded-xl border border-line p-6">

            {/* Invoice header: logo right, order info left */}
            <div className="mb-5 flex items-start justify-between border-b border-line pb-4">
              <Logo />
              <div className="text-right">
                <div className="nums font-bold tracking-wide">{order.orderNumber}</div>
                <div className="nums mt-1 text-xs text-muted">
                  {new Date(order.createdAt).toLocaleDateString('en-GB')}
                </div>
              </div>
            </div>

            {/* Customer info */}
            <div className="mb-5 text-sm">
              <div className="font-semibold">{order.customerName}</div>
              <div className="nums mt-0.5 text-muted">{order.phone}</div>
              {order.address && <div className="mt-0.5 text-muted">{order.address}</div>}
              <div className="mt-0.5 text-muted">التوصيل: {DELIVERY[order.deliveryZone].label}</div>
            </div>

            {/* Items table — explicit LTR so columns line up correctly */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ direction: 'rtl' }}>
                <thead className="border-y border-line text-muted">
                <tr>
                  <th className="py-2 pr-0 text-right font-medium">المنتج</th>
                  <th className="py-2 text-right font-medium">اللون</th>
                  <th className="py-2 text-right font-medium">الكمية</th>
                  <th className="py-2 text-right font-medium">السعر</th>
                  <th className="py-2 text-right font-medium">الإجمالي</th>
                </tr>
                </thead>
                <tbody>
                {order.items.map((it, i) => (
                    <tr key={i} className="border-b border-line">
                      <td className="py-2 text-right">
                        <div>{it.nameSnap}</div>
                        <div className="text-xs text-muted"><span className="nums">{it.codeSnap}</span></div>
                      </td>
                      <td className="py-2 text-right">{it.color || '—'}</td>
                      <td className="py-2 text-right"><span className="nums">{it.quantity}</span></td>
                      <td className="py-2 text-right"><span className="nums">{shekel(it.unitPrice)}</span></td>
                      <td className="py-2 text-right"><span className="nums">{shekel(it.lineTotal)}</span></td>
                    </tr>
                ))}
                </tbody>
              </table>
            </div>
            {/* Totals */}
            <div className="mt-4 mr-auto max-w-xs space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="nums">{shekel(order.subtotal)}</span>
                <span className="text-muted">المجموع الفرعي</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="nums">{shekel(order.deliveryFee)}</span>
                <span className="text-muted">التوصيل</span>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-1.5 font-bold">
                <span className="nums text-lime-hover">{shekel(order.total)}</span>
                <span>الإجمالي</span>
              </div>
            </div>
          </div>

          {/* Status control */}
          <div className="no-print mt-4">
            <label className="label">تحديث الحالة</label>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                  <button
                      key={s}
                      disabled={updateStatus.isPending}
                      onClick={() => updateStatus.mutate(s)}
                      className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                          order.status === s ? 'bg-charcoal text-white' : 'border border-line hover:bg-surface'
                      }`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
              ))}
            </div>
          </div>
        </div>
      </div>
  );
}
