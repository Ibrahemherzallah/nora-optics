import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { api } from '../../lib/api';
import { Category } from '../../lib/types';
import { Modal, ErrorBox, EmptyRow } from '../../components/admin/Modal';

interface OfferForm {
  _id?: string;
  title: string;
  type: 'category' | 'products' | 'product';
  category?: string;
  products: string[];
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);
const plus30 = () => new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

const TYPE_LABELS: Record<string, string> = { category: 'صنف كامل', products: 'مجموعة منتجات', product: 'منتج واحد' };

export function OffersAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<OfferForm | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-offers'],
    queryFn: async () => (await api.get('/admin/offers')).data.data,
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/offers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-offers'] }),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">العروض</h1>
        <button
          className="btn-primary"
          onClick={() =>
            setEditing({ title: '', type: 'product', products: [], discountType: 'percentage', discountValue: 10, startDate: today(), endDate: plus30(), isActive: true })
          }
        >
          <Plus size={18} /> عرض جديد
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted">جارٍ التحميل…</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface text-right text-muted">
              <tr>
                <th className="p-3 font-medium">العنوان</th>
                <th className="p-3 font-medium">النوع</th>
                <th className="p-3 font-medium">الخصم</th>
                <th className="p-3 font-medium">الفترة</th>
                <th className="p-3 font-medium">الحالة</th>
                <th className="p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {data?.map((o: any) => (
                <tr key={o._id} className="border-b border-line last:border-0">
                  <td className="p-3 font-medium">{o.title}</td>
                  <td className="p-3 text-muted">{TYPE_LABELS[o.type]}</td>
                  <td className="nums p-3">{o.discountType === 'percentage' ? `${o.discountValue}%` : `${o.discountValue} ₪`}</td>
                  <td className="nums p-3 text-xs text-muted">
                    {new Date(o.startDate).toLocaleDateString('en-GB')} ← {new Date(o.endDate).toLocaleDateString('en-GB')}
                  </td>
                  <td className="p-3">
                    {o.isActive ? (
                      <span className="rounded-full bg-lime/20 px-2 py-0.5 text-xs text-lime-hover">فعّال</span>
                    ) : (
                      <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted">متوقف</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <button
                        className="rounded-lg p-2 hover:bg-surface"
                        onClick={() =>
                          setEditing({
                            _id: o._id,
                            title: o.title,
                            type: o.type,
                            category: typeof o.category === 'object' ? o.category?._id : o.category,
                            products: (o.products || []).map((p: any) => (typeof p === 'object' ? p._id : p)),
                            discountType: o.discountType,
                            discountValue: o.discountValue,
                            startDate: o.startDate.slice(0, 10),
                            endDate: o.endDate.slice(0, 10),
                            isActive: o.isActive,
                          })
                        }
                      >
                        <Pencil size={16} />
                      </button>
                      <button className="rounded-lg p-2 text-destructive hover:bg-red-50" onClick={() => confirm(`حذف "${o.title}"؟`) && del.mutate(o._id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data?.length === 0 && <EmptyRow cols={6} text="لا توجد عروض بعد." />}
            </tbody>
          </table>
        </div>
      )}

      {editing && <OfferModal form={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function OfferModal({ form, onClose }: { form: OfferForm; onClose: () => void }) {
  const qc = useQueryClient();
  const [state, setState] = useState(form);
  const [error, setError] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');

  const { data: cats } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => (await api.get<{ data: Category[] }>('/admin/categories')).data.data,
  });
  const { data: products } = useQuery({
    queryKey: ['admin-products-all'],
    queryFn: async () => (await api.get('/admin/products?limit=200')).data.data,
  });

  const save = useMutation({
    mutationFn: () => {
      const payload: any = {
        title: state.title,
        type: state.type,
        discountType: state.discountType,
        discountValue: Number(state.discountValue),
        startDate: state.startDate,
        endDate: state.endDate,
        isActive: state.isActive,
      };
      if (state.type === 'category') payload.category = state.category;
      else payload.products = state.products;
      return state._id ? api.put(`/admin/offers/${state._id}`, payload) : api.post('/admin/offers', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-offers'] });
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  const toggleProduct = (id: string) =>
    setState((s) => {
      if (s.type === 'product') return { ...s, products: s.products.includes(id) ? [] : [id] };
      return { ...s, products: s.products.includes(id) ? s.products.filter((p) => p !== id) : [...s.products, id] };
    });

  const filtered = (products || []).filter(
    (p: any) => p.name.includes(productSearch) || p.code.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <Modal title={state._id ? 'تعديل عرض' : 'عرض جديد'} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="label">عنوان العرض *</label>
          <input className="input" value={state.title} onChange={(e) => setState({ ...state, title: e.target.value })} />
        </div>

        <div>
          <label className="label">نوع العرض *</label>
          <div className="grid grid-cols-3 gap-2">
            {(['product', 'products', 'category'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setState({ ...state, type: t, products: [], category: undefined })}
                className={`rounded-xl border px-3 py-2 text-sm ${state.type === t ? 'border-lime bg-lime/10 font-semibold' : 'border-line hover:bg-surface'}`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {state.type === 'category' ? (
          <div>
            <label className="label">الصنف *</label>
            <select className="input" value={state.category || ''} onChange={(e) => setState({ ...state, category: e.target.value })}>
              <option value="">اختر صنفاً</option>
              {cats?.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="label">{state.type === 'product' ? 'المنتج *' : 'المنتجات *'}</label>
            <div className="relative mb-2">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
              <input className="input pr-9" placeholder="بحث" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
            </div>
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-line p-2">
              {filtered.map((p: any) => (
                <label key={p._id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface">
                  <input
                    type={state.type === 'product' ? 'radio' : 'checkbox'}
                    checked={state.products.includes(p._id)}
                    onChange={() => toggleProduct(p._id)}
                    className="accent-lime"
                  />
                  <span className="flex-1">{p.name}</span>
                  <span className="nums text-xs text-muted">{p.code}</span>
                </label>
              ))}
              {filtered.length === 0 && <div className="py-3 text-center text-xs text-muted">لا توجد منتجات</div>}
            </div>
            {state.products.length > 0 && <p className="nums mt-1 text-xs text-muted">محدّد: {state.products.length}</p>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">نوع الخصم *</label>
            <select className="input" value={state.discountType} onChange={(e) => setState({ ...state, discountType: e.target.value as any })}>
              <option value="percentage">نسبة %</option>
              <option value="fixed">مبلغ ثابت ₪</option>
            </select>
          </div>
          <div>
            <label className="label">قيمة الخصم *</label>
            <input className="input nums" type="number" min={0} value={state.discountValue} onChange={(e) => setState({ ...state, discountValue: +e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">تاريخ البداية *</label>
            <input className="input nums" type="date" value={state.startDate} onChange={(e) => setState({ ...state, startDate: e.target.value })} />
          </div>
          <div>
            <label className="label">تاريخ الانتهاء *</label>
            <input className="input nums" type="date" value={state.endDate} onChange={(e) => setState({ ...state, endDate: e.target.value })} />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={state.isActive} onChange={(e) => setState({ ...state, isActive: e.target.checked })} className="accent-lime" />
          العرض فعّال
        </label>

        <ErrorBox message={error} />
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-ghost" onClick={onClose}>
            إلغاء
          </button>
          <button className="btn-primary" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? 'جارٍ الحفظ…' : 'حفظ'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
