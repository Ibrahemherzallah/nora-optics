import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { TrendingUp, Wallet, ShoppingCart, Package, Users, Tag } from 'lucide-react';
import { api } from '@/lib/api.ts';
import { shekel, STATUS_LABELS, STATUS_COLORS } from '@/lib/format.ts';
import {useState} from "react";

interface Dashboard {
  today: { sales: number; profit: number; count: number };
  month: { sales: number; profit: number; count: number };
  orders: Record<string, number>;
  counts: { products: number; customers: number; activeOffers: number };
  recentOrders: { _id: string; orderNumber: string; customerName: string; total: number; status: string; createdAt: string }[];
}

export function Dashboard() {
  const [exporting, setExporting] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get<Dashboard>('/admin/dashboard')).data,
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/admin/export', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nora-export-${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) return <div className="py-16 text-center text-muted">جارٍ التحميل…</div>;
  if (isError) return <div className="rounded-xl bg-red-50 p-6 text-center text-destructive">{(error as Error).message}</div>;
  if (!data) return null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">لوحة المعلومات</h1>
        <Link
            to="/"
            className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium transition hover:bg-surface"
        >
          ← العودة للمتجر
        </Link>
      </div>

      {/* Primary stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<TrendingUp size={20} />} label="مبيعات اليوم" value={shekel(data.today.sales)} sub={`${data.today.count} عملية`} />
        <StatCard icon={<Wallet size={20} />} label="ربح اليوم" value={shekel(data.today.profit)} sub="بعد التكلفة" highlight />
        <StatCard
          icon={<ShoppingCart size={20} />}
          label="طلبات قيد الانتظار"
          value={String(data.orders.pending || 0)}
          sub={`${data.orders.total} طلب إجمالاً`}
          to="/admin/orders"
        />
        <StatCard icon={<TrendingUp size={20} />} label="ربح هذا الشهر" value={shekel(data.month.profit)} sub={`مبيعات ${shekel(data.month.sales)}`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Recent orders */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">أحدث الطلبات</h2>
            <Link to="/admin/orders" className="text-sm text-lime-hover hover:underline">
              عرض الكل ←
            </Link>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-surface text-right text-muted">
                <tr>
                  <th className="p-3 font-medium">رقم الطلب</th>
                  <th className="p-3 font-medium">العميل</th>
                  <th className="p-3 font-medium">الإجمالي</th>
                  <th className="p-3 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((o) => (
                  <tr key={o._id} className="border-b border-line last:border-0">
                    <td className="nums p-3 font-semibold">{o.orderNumber}</td>
                    <td className="p-3">{o.customerName}</td>
                    <td className="nums p-3">{shekel(o.total)}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[o.status]}`}>{STATUS_LABELS[o.status]}</span>
                    </td>
                  </tr>
                ))}
                {data.recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-muted">
                      لا توجد طلبات بعد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side panel: order pipeline + counts */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-line bg-white p-5">
            <h2 className="mb-3 font-bold">حالة الطلبات</h2>
            <div className="space-y-2">
              {(['pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled'] as const).map((s) => (
                <div key={s} className="flex items-center justify-between text-sm">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[s]}`}>{STATUS_LABELS[s]}</span>
                  <span className="nums font-semibold">{data.orders[s] || 0}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <MiniCard icon={<Package size={18} />} value={data.counts.products} label="منتج" to="/admin/products" />
            <MiniCard icon={<Users size={18} />} value={data.counts.customers} label="عميل" />
            <MiniCard icon={<Tag size={18} />} value={data.counts.activeOffers} label="عرض فعّال" to="/admin/offers" />
          </div>
          <button className="btn-primary" disabled={exporting} onClick={handleExport}>
            {exporting ? 'جارٍ التصدير…' : '⬇ تصدير Excel'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  highlight,
  to,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  to?: string;
}) {
  const inner = (
    <div className={`rounded-2xl border p-5 shadow-card transition ${highlight ? 'border-transparent bg-charcoal text-white' : 'border-line bg-white hover:shadow-cardHover'}`}>
      <div className="flex items-center justify-between">
        <span className={`text-sm ${highlight ? 'text-white/70' : 'text-muted'}`}>{label}</span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${highlight ? 'bg-lime text-lime-fg' : 'bg-lime/15 text-lime-hover'}`}>{icon}</span>
      </div>
      <div className={`nums mt-3 text-2xl font-extrabold ${highlight ? 'text-lime' : ''}`}>{value}</div>
      {sub && <div className={`nums mt-1 text-xs ${highlight ? 'text-white/50' : 'text-muted'}`}>{sub}</div>}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

function MiniCard({ icon, value, label, to }: { icon: React.ReactNode; value: number; label: string; to?: string }) {
  const inner = (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-line bg-white p-3 text-center transition hover:shadow-card">
      <span className="text-lime-hover">{icon}</span>
      <span className="nums text-lg font-bold">{value}</span>
      <span className="text-[11px] text-muted">{label}</span>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}
