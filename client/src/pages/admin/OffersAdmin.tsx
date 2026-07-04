import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search, ChevronDown } from 'lucide-react';
import { api } from '../../lib/api';
import { Category } from '../../lib/types';
import { Modal, ErrorBox, EmptyRow } from '../../components/admin/Modal';
import { Checkbox } from '@/components/ui/checkbox';

interface OfferForm {
  _id?: string;
  title: string;
  type: 'all' | 'categories' | 'products' | 'product';
  categories: string[];
  products: string[];
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);
const plus30 = () => new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

const TYPE_LABELS: Record<string, string> = {
  all: 'كل المنتجات',
  categories: 'أصناف محددة',
  products: 'مجموعة منتجات',
  product: 'منتج واحد',
};

const emptyForm: OfferForm = {
  title: '',
  type: 'product',
  categories: [],
  products: [],
  discountType: 'percentage',
  discountValue: 10,
  startDate: today(),
  endDate: plus30(),
  isActive: true,
};

// ── Multi-select dropdown for categories ──────────────────────────────────────
function CategoryMultiSelect({
                               categories,
                               selected,
                               onChange,
                             }: {
  categories: Category[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = categories.filter((c) => c.name.includes(search));
  const toggle = (id: string) =>
      onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
      <div ref={ref} className="relative">
        <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-sm transition bg-white hover:border-muted ${open ? 'border-lime ring-2 ring-lime/20' : 'border-line'}`}
        >
        <span className={selected.length ? '' : 'text-muted'}>
          {selected.length ? `${selected.length} أصناف مختارة` : 'اختر الأصناف *'}
        </span>
          <ChevronDown size={16} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
            <div className="absolute right-0 top-full z-50 mt-1 w-full overflow-hidden rounded-xl border border-line bg-white shadow-lg">
              <div className="flex items-center gap-2 border-b border-line px-3 py-2">
                <Search size={14} className="shrink-0 text-muted" />
                <input
                    autoFocus
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
                    placeholder="بحث"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="max-h-44 overflow-y-auto py-1">
                {filtered.length === 0 && <div className="px-4 py-3 text-center text-sm text-muted">لا توجد نتائج</div>}
                {filtered.map((cat) => (
                    <button
                        key={cat._id}
                        type="button"
                        onClick={() => toggle(cat._id)}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-right text-sm hover:bg-surface"
                    >
                      <Checkbox checked={selected.includes(cat._id)} onCheckedChange={() => toggle(cat._id)} />
                      <span>{cat.name}</span>
                    </button>
                ))}
              </div>
              {selected.length > 0 && (
                  <div className="border-t border-line px-4 py-2 text-xs text-muted">محدد {selected.length}</div>
              )}
            </div>
        )}
      </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
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
          <button className="btn-primary" onClick={() => setEditing({ ...emptyForm })}>
            <Plus size={18} /> عرض جديد
          </button>
        </div>

        {isLoading ? (
            <div className="py-12 text-center text-muted">جارٍ التحميل…</div>
        ) : (
            <div className="overflow-x-auto rounded-2xl border border-line bg-white">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-surface text-muted">
                <tr>
                  <th className="p-3 text-right font-medium">العنوان</th>
                  <th className="p-3 text-right font-medium">النوع</th>
                  <th className="p-3 text-right font-medium">الخصم</th>
                  <th className="p-3 text-right font-medium">الفترة</th>
                  <th className="p-3 text-right font-medium">الحالة</th>
                  <th className="w-24 p-3 font-medium"></th>
                </tr>
                </thead>
                <tbody>
                {data?.map((o: any) => (
                    <tr key={o._id} className="border-b border-line last:border-0">
                      <td className="p-3 text-right font-medium">{o.title}</td>
                      <td className="p-3 text-right text-muted">{TYPE_LABELS[o.type] ?? o.type}</td>
                      <td className="p-3 text-right">
                        <span className="nums">{o.discountType === 'percentage' ? `${o.discountValue}%` : `${o.discountValue} ₪`}</span>
                      </td>
                      <td className="p-3 text-right text-xs text-muted">
                        <span className="nums">{new Date(o.startDate).toLocaleDateString('en-GB')} ← {new Date(o.endDate).toLocaleDateString('en-GB')}</span>
                      </td>
                      <td className="p-3 text-right">
                        {o.isActive ? (
                            <span className="rounded-full bg-lime/20 px-2 py-0.5 text-xs text-lime-hover">فعّال</span>
                        ) : (
                            <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted">متوقف</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-start gap-1">
                          <button
                              className="rounded-lg p-2 hover:bg-surface"
                              onClick={() =>
                                  setEditing({
                                    _id: o._id,
                                    title: o.title,
                                    type: o.type,
                                    categories: (o.categories || (o.category ? [typeof o.category === 'object' ? o.category._id : o.category] : [])),
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
                          <button
                              className="rounded-lg p-2 text-destructive hover:bg-red-50"
                              onClick={() => confirm(`حذف "${o.title}"؟`) && del.mutate(o._id)}
                          >
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

// ── Modal ─────────────────────────────────────────────────────────────────────
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
      if (state.type === 'categories') payload.categories = state.categories;
      else if (state.type !== 'all') payload.products = state.products;
      return state._id ? api.put(`/admin/offers/${state._id}`, payload) : api.post('/admin/offers', payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-offers'] }); onClose(); },
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
          {/* Title */}
          <div>
            <label className="label">عنوان العرض *</label>
            <input className="input" value={state.title} onChange={(e) => setState({ ...state, title: e.target.value })} />
          </div>

          {/* Type selector */}
          <div>
            <label className="label">نوع العرض *</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(['all', 'categories', 'products', 'product'] as const).map((t) => (
                  <button
                      key={t}
                      type="button"
                      onClick={() => setState({ ...state, type: t, products: [], categories: [] })}
                      className={`rounded-xl border px-3 py-2 text-sm transition ${state.type === t ? 'border-lime bg-lime/10 font-semibold text-lime-hover' : 'border-line hover:bg-surface'}`}
                  >
                    {TYPE_LABELS[t]}
                  </button>
              ))}
            </div>
          </div>

          {/* All products — no extra input needed */}
          {state.type === 'all' && (
              <div className="rounded-xl border border-lime/30 bg-lime/5 px-4 py-3 text-sm text-lime-hover">
                سيُطبَّق هذا العرض على جميع المنتجات المتاحة في المتجر.
              </div>
          )}

          {/* Multi-category */}
          {state.type === 'categories' && (
              <div>
                <label className="label">الأصناف *</label>
                <CategoryMultiSelect
                    categories={cats || []}
                    selected={state.categories}
                    onChange={(ids) => setState({ ...state, categories: ids })}
                />
              </div>
          )}

          {/* Single or multi product */}
          {(state.type === 'product' || state.type === 'products') && (
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

          {/* Discount */}
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

          {/* Dates */}
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

          {/* Active */}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={state.isActive} onChange={(e) => setState({ ...state, isActive: e.target.checked })} className="accent-lime" />
            العرض فعّال
          </label>

          <ErrorBox message={error} />
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-ghost" onClick={onClose}>إلغاء</button>
            <button className="btn-primary" disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? 'جارٍ الحفظ…' : 'حفظ'}
            </button>
          </div>
        </div>
      </Modal>
  );
}
