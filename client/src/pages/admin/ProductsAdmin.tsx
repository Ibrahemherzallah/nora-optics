import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Upload, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { Category } from '../../lib/types';
import { shekel } from '../../lib/format';
import { uploadImageToFirebase } from '../../lib/firebase';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface ColorForm {
  name: string;
  images: string[];
}
interface ProductForm {
  _id?: string;
  name: string;
  code: string;
  category: string;
  price: number;
  cost: number;
  size?: string;
  colors: ColorForm[];
  isSoldOut: boolean;
}

const emptyForm: ProductForm = {
  name: '',
  code: '',
  category: '',
  price: 0,
  cost: 0,
  size: '',
  colors: [{ name: '', images: [] }],
  isSoldOut: false,
};

export function ProductsAdmin() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<ProductForm | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', search],
    queryFn: async () => (await api.get(`/admin/products?search=${encodeURIComponent(search)}`)).data,
  });
  const { data: cats } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => (await api.get<{ data: Category[] }>('/admin/categories')).data.data,
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-products'] }),
  });

  return (
      <div>
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">المنتجات</h1>
          <button className="btn-primary" onClick={() => setEditing({ ...emptyForm, category: cats?.[0]?._id || '' })}>
            <Plus size={18} /> منتج جديد
          </button>
        </div>

        <input className="input mb-4 md:max-w-xs" placeholder="بحث بالاسم أو الكود" value={search} onChange={(e) => setSearch(e.target.value)} />

        {isLoading ? (
            <div className="py-12 text-center text-muted">جارٍ التحميل…</div>
        ) : (
            <div className="overflow-x-auto rounded-2xl border border-line bg-white">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-surface text-muted">
                <tr>
                  <th className="p-3 text-right font-medium">المنتج</th>
                  <th className="p-3 text-right font-medium">الكود</th>
                  <th className="p-3 text-right font-medium">السعر</th>
                  <th className="p-3 text-right font-medium">التكلفة</th>
                  <th className="p-3 text-right font-medium">الحالة</th>
                  <th className="w-24 p-3 font-medium"></th>
                </tr>
                </thead>
                <tbody>
                {data?.data?.map((p: any) => (
                    <tr key={p._id} className="border-b border-line last:border-0">
                      <td className="p-3 text-right">
                        <div className="flex items-center gap-2">
                          {p.colors?.[0]?.images?.[0] && <img src={p.colors[0].images[0]} alt="" className="h-10 w-10 rounded-lg object-cover" />}
                          <span className="font-medium">{p.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right text-muted"><span className="nums">{p.code}</span></td>
                      <td className="p-3 text-right"><span className="nums">{shekel(p.price)}</span></td>
                      <td className="p-3 text-right text-muted"><span className="nums">{shekel(p.cost)}</span></td>
                      <td className="p-3 text-right">
                        {p.isSoldOut ? (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-destructive">نفذت</span>
                        ) : (
                            <span className="rounded-full bg-lime/15 px-2 py-0.5 text-xs text-lime-hover">متوفر</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-start gap-1">
                          <button
                              className="rounded-lg p-2 hover:bg-surface"
                              onClick={() =>
                                  setEditing({
                                    _id: p._id,
                                    name: p.name,
                                    code: p.code,
                                    category: typeof p.category === 'object' ? p.category._id : p.category,
                                    price: p.price,
                                    cost: p.cost,
                                    size: p.size,
                                    colors: p.colors?.length ? p.colors : [{ name: '', images: [] }],
                                    isSoldOut: p.isSoldOut,
                                  })
                              }
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                              className="rounded-lg p-2 text-destructive hover:bg-red-50"
                              onClick={() => confirm(`حذف "${p.name}"؟`) && del.mutate(p._id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                ))}
                {data?.data?.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-muted">
                        لا توجد منتجات بعد. ابدأ بإضافة منتج.
                      </td>
                    </tr>
                )}
                </tbody>
              </table>
            </div>
        )}

        {editing && <ProductModal form={editing} categories={cats || []} onClose={() => setEditing(null)} />}
      </div>
  );
}

function ProductModal({ form, categories, onClose }: { form: ProductForm; categories: Category[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [state, setState] = useState<ProductForm>(form);
  const [error, setError] = useState<string | null>(null);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Field-level validation mirroring the backend productSchema.
  const validate = (s: ProductForm): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!s.name.trim()) e.name = 'الاسم مطلوب';
    if (!s.code.trim()) e.code = 'الكود مطلوب';
    if (!s.category) e.category = 'اختر صنفاً';
    if (s.price === null || s.price === undefined || Number.isNaN(s.price)) e.price = 'السعر مطلوب';
    else if (s.price <= 0) e.price = 'السعر يجب أن يكون أكبر من صفر';
    if (s.cost === null || s.cost === undefined || Number.isNaN(s.cost)) e.cost = 'التكلفة مطلوبة';
    else if (s.cost < 0) e.cost = 'التكلفة غير صحيحة';

    s.colors.forEach((c, i) => {
      if (!c.name.trim()) e[`color_name_${i}`] = 'اسم اللون مطلوب';
      if (c.images.length === 0) e[`color_img_${i}`] = 'أضف صورة واحدة على الأقل';
    });
    return e;
  };

  // Clear a single field's error as the user fixes it (only after a first submit attempt).
  const clearError = (key: string) =>
      setErrors((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });

  const save = useMutation({
    mutationFn: async (body: ProductForm) => {
      const payload = { ...body, price: Number(body.price), cost: Number(body.cost) };
      if (body._id) return api.put(`/admin/products/${body._id}`, payload);
      return api.post('/admin/products', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  const handleSave = () => {
    setError(null);
    const e = validate(state);
    setErrors(e);
    if (Object.keys(e).length > 0) return; // block submit
    save.mutate(state);
  };

  const uploadImages = async (colorIdx: number, files: FileList) => {
    setUploadingIdx(colorIdx);
    setError(null);
    try {
      const urls = await Promise.all(Array.from(files).map((f) => uploadImageToFirebase(f)));
      setState((s) => {
        const colors = [...s.colors];
        colors[colorIdx] = { ...colors[colorIdx], images: [...colors[colorIdx].images, ...urls] };
        return { ...s, colors };
      });
      clearError(`color_img_${colorIdx}`);
    } catch (e) {
      setError((e as Error).message || 'فشل رفع الصور');
    } finally {
      setUploadingIdx(null);
    }
  };

  const errCls = (key: string) => (errors[key] ? 'input border-destructive focus:ring-destructive/30' : 'input');
  const Err = ({ k }: { k: string }) => (errors[k] ? <p className="mt-1 text-xs text-destructive">{errors[k]}</p> : null);

  return (
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-charcoal/40 p-4">
        <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">{state._id ? 'تعديل منتج' : 'منتج جديد'}</h2>
            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-surface">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">الاسم *</label>
                <input className={errCls('name')} value={state.name} onChange={(e) => { setState({ ...state, name: e.target.value }); clearError('name'); }} />
                <Err k="name" />
              </div>
              <div>
                <label className="label">الكود *</label>
                <input className={`${errCls('code')} nums`} value={state.code} onChange={(e) => { setState({ ...state, code: e.target.value }); clearError('code'); }} />
                <Err k="code" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">السعر *</label>
                <input className={`${errCls('price')} nums`} type="number" min={0} value={state.price} onChange={(e) => { setState({ ...state, price: +e.target.value }); clearError('price'); }} />
                <Err k="price" />
              </div>
              <div>
                <label className="label">التكلفة *</label>
                <input className={`${errCls('cost')} nums`} type="number" min={0} value={state.cost} onChange={(e) => { setState({ ...state, cost: +e.target.value }); clearError('cost'); }} />
                <Err k="cost" />
              </div>
              <div>
                <label className="label">المقاس</label>
                <input className="input" value={state.size || ''} onChange={(e) => setState({ ...state, size: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="label">الصنف *</label>
              <select className={errCls('category')} value={state.category} onChange={(e) => { setState({ ...state, category: e.target.value }); clearError('category'); }}>
                <option value="">اختر صنفاً</option>
                {categories.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
              <Err k="category" />
            </div>

            {/* Colors */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="label mb-0">الألوان والصور</label>
                <button className="text-sm text-lime-hover hover:underline" onClick={() => setState((s) => ({ ...s, colors: [...s.colors, { name: '', images: [] }] }))}>
                  + إضافة لون
                </button>
              </div>
              <div className="space-y-3">
                {state.colors.map((c, idx) => (
                    <div key={idx} className="rounded-xl border border-line p-3">
                      <div className="flex items-center gap-2">
                        <input
                            className={errCls(`color_name_${idx}`)}
                            placeholder="اسم اللون (مثال: أسود)"
                            value={c.name}
                            onChange={(e) => {
                              const colors = [...state.colors];
                              colors[idx] = { ...colors[idx], name: e.target.value };
                              setState({ ...state, colors });
                              clearError(`color_name_${idx}`);
                            }}
                        />
                        {state.colors.length > 1 && (
                            <button className="rounded-lg p-2 text-destructive hover:bg-red-50" onClick={() => setState((s) => ({ ...s, colors: s.colors.filter((_, i) => i !== idx) }))}>
                              <Trash2 size={16} />
                            </button>
                        )}
                      </div>
                      <Err k={`color_name_${idx}`} />

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {c.images.map((img, i) => (
                            <div key={i} className="relative">
                              <img src={img} alt="" className="h-14 w-14 rounded-lg object-cover" />
                              <button
                                  className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-white"
                                  onClick={() => {
                                    const colors = [...state.colors];
                                    colors[idx] = { ...colors[idx], images: colors[idx].images.filter((_, j) => j !== i) };
                                    setState({ ...state, colors });
                                  }}
                              >
                                <X size={12} />
                              </button>
                            </div>
                        ))}
                        <label className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-line hover:bg-surface">
                          {uploadingIdx === idx ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} className="text-muted" />}
                          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && uploadImages(idx, e.target.files)} />
                        </label>
                      </div>
                      <Err k={`color_img_${idx}`} />
                    </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="isSoldOut" checked={state.isSoldOut} onCheckedChange={(checked) => setState({ ...state, isSoldOut: checked })} />
              <Label htmlFor="isSoldOut">نفذت الكمية</Label>
            </div>

            {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-destructive">{error}</div>}

            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-ghost" onClick={onClose}>إلغاء</button>
              <button className="btn-primary" disabled={save.isPending} onClick={handleSave}>
                {save.isPending ? 'جارٍ الحفظ…' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      </div>
  );
}