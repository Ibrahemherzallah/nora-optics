import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useReactToPrint } from 'react-to-print';
import { Printer, X } from 'lucide-react';
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

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">الطلبات</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setFilter('')} className={chip(filter === '')}>
          الكل
        </button>
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
            <thead className="border-b border-line bg-surface text-right text-muted">
              <tr>
                <th className="p-3 font-medium">رقم الطلب</th>
                <th className="p-3 font-medium">العميل</th>
                <th className="p-3 font-medium">المنطقة</th>
                <th className="p-3 font-medium">الإجمالي</th>
                <th className="p-3 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {data?.data?.map((o: Order) => (
                <tr key={o._id} className="cursor-pointer border-b border-line last:border-0 hover:bg-surface" onClick={() => setSelected(o)}>
                  <td className="nums p-3 font-semibold">{o.orderNumber}</td>
                  <td className="p-3">
                    {o.customerName}
                    <div className="nums text-xs text-muted">{o.phone}</div>
                  </td>
                  <td className="p-3">{DELIVERY[o.deliveryZone].label}</td>
                  <td className="nums p-3 font-semibold">{shekel(o.total)}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[o.status]}`}>{STATUS_LABELS[o.status]}</span>
                  </td>
                </tr>
              ))}
              {data?.data?.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-muted">
                    لا توجد طلبات.
                  </td>
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
          <div className="mb-4 flex items-center justify-between border-b border-line pb-4">
            <Logo />
            <div className="text-left">
              <div className="nums font-bold">{order.orderNumber}</div>
              <div className="nums text-xs text-muted">{new Date(order.createdAt).toLocaleDateString('en-GB')}</div>
            </div>
          </div>

          <div className="mb-4 text-sm">
            <div className="font-semibold">{order.customerName}</div>
            <div className="nums text-muted">{order.phone}</div>
            {order.address && <div className="text-muted">{order.address}</div>}
            <div className="text-muted">التوصيل: {DELIVERY[order.deliveryZone].label}</div>
          </div>

          <table className="w-full text-sm">
            <thead className="border-y border-line text-right text-muted">
              <tr>
                <th className="py-2 font-medium">المنتج</th>
                <th className="py-2 font-medium">اللون</th>
                <th className="py-2 font-medium">الكمية</th>
                <th className="py-2 font-medium">السعر</th>
                <th className="py-2 font-medium">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it, i) => (
                <tr key={i} className="border-b border-line">
                  <td className="py-2">
                    {it.nameSnap}
                    <div className="nums text-xs text-muted">{it.codeSnap}</div>
                  </td>
                  <td className="py-2">{it.color || '—'}</td>
                  <td className="nums py-2">{it.quantity}</td>
                  <td className="nums py-2">{shekel(it.unitPrice)}</td>
                  <td className="nums py-2">{shekel(it.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">المجموع الفرعي</span>
              <span className="nums">{shekel(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">التوصيل</span>
              <span className="nums">{shekel(order.deliveryFee)}</span>
            </div>
            <div className="flex justify-between border-t border-line pt-1 font-bold">
              <span>الإجمالي</span>
              <span className="nums text-lime-hover">{shekel(order.total)}</span>
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
