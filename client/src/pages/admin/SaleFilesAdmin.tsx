import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Search, Pencil } from 'lucide-react';
import { api } from '@/lib/api.ts';
import { shekel } from '@/lib/format.ts';
import { Modal, ErrorBox, EmptyRow } from '../../components/admin/Modal';
import { CustomerPicker, PickedCustomer } from '../../components/admin/CustomerPicker';
import { ProductPicker, PickedProduct } from '../../components/admin/ProductPicker';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';


interface Draft {
  product: PickedProduct;
  priceType: 'original' | 'custom';
  customPrice: string;
  quantity: number;
  hasAccessories: boolean;
  accessoriesDesc: string;
  accessoriesCost: string;
  notes: string;
}

function calc(d: Draft) {
  const sellingPrice = d.priceType === 'custom' ? Number(d.customPrice) || 0 : d.product.price;
  const accCost = d.hasAccessories ? Number(d.accessoriesCost) || 0 : 0;
  const profit = (sellingPrice - d.product.cost) * d.quantity - accCost;
  return { sellingPrice, profit };
}

function draftToPayload(d: Draft) {
  return {
    productId: d.product._id,
    priceType: d.priceType,
    customPrice: d.priceType === 'custom' ? Number(d.customPrice) : undefined,
    quantity: d.quantity,
    hasAccessories: d.hasAccessories,
    accessoriesDesc: d.hasAccessories ? d.accessoriesDesc || undefined : undefined,
    accessoriesCost: d.hasAccessories ? Number(d.accessoriesCost) : undefined,
    notes: d.notes.trim() || undefined,
  };
}

const newDraft = (p: PickedProduct): Draft => ({
  product: p,
  priceType: 'original',
  customPrice: '',
  quantity: 1,
  hasAccessories: false,
  accessoriesDesc: '',
  accessoriesCost: '',
  notes: '',
});

export function SaleFilesAdmin() {
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/sale-files/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-sale-files'] }),
  });
  const { data, isLoading } = useQuery({
    queryKey: ['admin-sale-files', search],
    queryFn: async () => (await api.get(`/admin/sale-files?search=${encodeURIComponent(search)}`)).data,
  });

  return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">ملفات البيع</h1>
          <button className="btn-primary" onClick={() => setCreating(true)}>
            <Plus size={18} /> عملية بيع جديدة
          </button>
        </div>

        {/* #6 — search */}
        <div className="relative mb-4 md:max-w-xs">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input pr-9" placeholder="ابحث باسم العميل أو الهاتف" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {isLoading ? (
            <div className="py-12 text-center text-muted">جارٍ التحميل…</div>
        ) : (
            <div className="overflow-x-auto rounded-2xl border border-line bg-white">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-surface text-muted">
                <tr>
                  <th className="p-3 text-right font-medium">العميل</th>
                  <th className="p-3 text-right font-medium">عدد العمليات</th>
                  <th className="p-3 text-right font-medium">إجمالي البيع</th>
                  <th className="p-3 text-right font-medium">إجمالي الربح</th>
                  <th className="p-3 text-right font-medium">المصدر</th>
                  <th className="w-24 p-3 font-medium">إجراءات</th>
                </tr>
                </thead>
                <tbody>
                {data?.data?.map((f: any) => (
                    <tr key={f._id} className="cursor-pointer border-b border-line last:border-0 hover:bg-surface" onClick={() => setOpenId(f._id)}>
                      <td className="p-3 text-right">
                        {f.walkIn || !f.customer ? (
                            <span className="font-medium">زبون محل</span>
                        ) : (
                            <>
                              <span className="font-medium">{f.customer?.name || '—'}</span>
                              <div className="text-xs text-muted"><span className="nums">{f.customer?.phone}</span></div>
                            </>
                        )}
                      </td>
                      <td className="p-3 text-right"><span className="nums">{f.records?.length || 0}</span></td>
                      <td className="p-3 text-right"><span className="nums">{shekel(f.totalSelling)}</span></td>
                      <td className="p-3 text-right font-semibold text-lime-hover">
                        {f.isVoided ? '—' : <span className="nums">{shekel(f.totalProfit)}</span>}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex flex-wrap gap-1">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${f.origin === 'online' ? 'bg-blue-100 text-blue-800' : 'bg-surface text-muted'}`}>
                        {f.origin === 'online' ? 'أونلاين' : 'المحل'}
                      </span>
                          {f.isVoided && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-destructive">ملغي</span>}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-start gap-1">
                          <button
                              className="rounded-lg p-2 hover:bg-surface"
                              title="تعديل / عرض"
                              onClick={(e) => { e.stopPropagation(); setOpenId(f._id); }}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                              className="rounded-lg p-2 text-destructive hover:bg-red-50"
                              title="حذف"
                              onClick={(e) => {
                                e.stopPropagation();
                                const who = f.walkIn || !f.customer ? 'زبون محل' : f.customer?.name;
                                if (confirm(`حذف ملف البيع لـ "${who}"؟`)) del.mutate(f._id);
                              }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                ))}
                {data?.data?.length === 0 && <EmptyRow cols={6} text="لا توجد ملفات بيع بعد." />}
                </tbody>
              </table>
            </div>
        )}

        {creating && (
            <CreateSaleModal
                onClose={() => setCreating(false)}
                onExistingFile={(fileId) => {
                  setCreating(false);   // close the "new sale" modal
                  setOpenId(fileId);    // open that customer's existing sale file
                }}
            />
        )}
        {openId && <SaleFileDetail id={openId} onClose={() => setOpenId(null)} />}
      </div>
  );
}

// ---------- Create (POS) ----------
function CreateSaleModal({ onClose, onExistingFile }: { onClose: () => void; onExistingFile: (fileId: string) => void }) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'existing' | 'new' | 'walkin'>('existing'); // #5
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [nc, setNc] = useState({ name: '', phone: '', address: '', age: '', sex: '' });
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [existingFileId, setExistingFileId] = useState<string | null>(null);

  const totalSelling = drafts.reduce((s, d) => s + calc(d).sellingPrice * d.quantity, 0);
  const totalProfit = drafts.reduce((s, d) => s + calc(d).profit, 0);

  const save = useMutation({
    mutationFn: () => {
      const payload: any = { records: drafts.map(draftToPayload) };
      if (mode === 'existing' && customer) payload.customerId = customer._id;
      else if (mode === 'walkin') payload.walkIn = true;
      else payload.newCustomer = {
          name: nc.name,
          phone: nc.phone || undefined,
          address: nc.address || undefined,
          age: nc.age ? Number(nc.age) : undefined,
          sex: nc.sex || undefined,
        };
      return api.post('/admin/sale-files', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-sale-files'] });
      onClose();
    },
    onError: (e: any) => {
      // try to parse the structured "already has a file" error
      const raw = e?.response?.data?.error?.message ?? (e as Error).message;
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.saleFileId) {
          setExistingFileId(parsed.saleFileId);
          setError(parsed.message);
          return;
        }
      } catch {
        /* not structured — fall through */
      }
      setError(raw);
    },
  });


  const phoneOk = nc.phone === '' || /^\d{10}$/.test(nc.phone);
  const canSave = drafts.length > 0 && (mode === 'existing' ? !!customer : mode === 'walkin' ? true : nc.name.trim().length > 0 && phoneOk);

  return (
      <Modal title="عملية بيع جديدة" onClose={onClose} maxWidth="max-w-3xl">
        <div className="space-y-5">
          {/* Step 1: customer */}
          <section>
            <h3 className="mb-2 text-sm font-bold text-muted">١ · العميل</h3>
            <div className="mb-2 flex flex-wrap gap-2">
              <button onClick={() => setMode('existing')} className={tab(mode === 'existing')}>عميل موجود</button>
              <button onClick={() => setMode('new')} className={tab(mode === 'new')}>عميل جديد</button>
              <button onClick={() => setMode('walkin')} className={tab(mode === 'walkin')}>زبون محل</button>
            </div>

            {mode === 'existing' && <CustomerPicker value={customer} onPick={setCustomer} />}

            {mode === 'new' && (
                <div className="grid grid-cols-2 gap-3">
                  <input className="input" placeholder="الاسم *" value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} />
                  <input
                      className={`input nums ${!phoneOk ? 'border-destructive' : ''}`}
                      placeholder="الهاتف (اختياري · 10 أرقام)"
                      inputMode="numeric"
                      value={nc.phone}
                      onChange={(e) => setNc({ ...nc, phone: e.target.value })}
                  />
                  <input className="input" placeholder="العنوان" value={nc.address} onChange={(e) => setNc({ ...nc, address: e.target.value })} />
                  <input className="input nums" type="number" placeholder="العمر" value={nc.age} onChange={(e) => setNc({ ...nc, age: e.target.value })} />
                  <select className="input" value={nc.sex} onChange={(e) => setNc({ ...nc, sex: e.target.value })}>
                    <option value="">الجنس</option>
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>
            )}

            {mode === 'walkin' && (
                <div className="rounded-xl border border-dashed border-line bg-surface p-3 text-sm text-muted">
                  بيع سريع لزبون المحل — لن يتم حفظ ملف عميل، فقط تفاصيل البيع.
                </div>
            )}
          </section>

          {/* Step 2: products */}
          <section>
            <h3 className="mb-2 text-sm font-bold text-muted">٢ · المنتجات</h3>
            <ProductPicker onPick={(p) => setDrafts((d) => [...d, newDraft(p)])} />
            <div className="mt-3 space-y-3">
              {drafts.map((d, idx) => (
                  <DraftRow
                      key={idx}
                      draft={d}
                      onChange={(nd) => setDrafts((arr) => arr.map((x, i) => (i === idx ? nd : x)))}
                      onRemove={() => setDrafts((arr) => arr.filter((_, i) => i !== idx))}
                  />
              ))}
            </div>
          </section>

          {/* Totals */}
          {drafts.length > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-surface p-4 text-sm">
                <span>إجمالي البيع: <span className="nums font-bold">{shekel(totalSelling)}</span></span>
                <span>إجمالي الربح: <span className="nums font-bold text-lime-hover">{shekel(totalProfit)}</span></span>
              </div>
          )}
          {existingFileId ? (
              <div className="rounded-xl bg-amber-50 p-3 text-sm">
                <p className="text-amber-800">يوجد ملف بيع لهذا العميل بالفعل.</p>
                <button className="btn-primary mt-2" onClick={() => onExistingFile(existingFileId)}>
                  فتح ملف العميل وإضافة العملية
                </button>
              </div>
          ) : (
              <ErrorBox message={error} />
          )}
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={onClose}>إلغاء</button>
            <button className="btn-primary" disabled={!canSave || save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? 'جارٍ الحفظ…' : 'حفظ الملف'}
            </button>
          </div>
        </div>
      </Modal>
  );
}

function DraftRow({ draft, onChange, onRemove }: { draft: Draft; onChange: (d: Draft) => void; onRemove: () => void }) {
  const { sellingPrice, profit } = calc(draft);
  return (
      <div className="rounded-xl border border-line p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {draft.product.image && <img src={draft.product.image} alt="" className="h-9 w-9 rounded-lg object-cover" />}
            <div>
              <div className="flex items-center gap-2 text-sm font-medium">
                {draft.product.name}
                {draft.product.code && (
                    <span className="nums rounded bg-surface px-1.5 py-0.5 text-xs text-muted">{draft.product.code}</span>
                )}
              </div>
              <div className="nums text-xs text-muted">التكلفة {shekel(draft.product.cost)} · السعر {shekel(draft.product.price)}</div>
            </div>
          </div>
          <button className="rounded-lg p-1.5 text-destructive hover:bg-red-50" onClick={onRemove}><Trash2 size={16} /></button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="label text-xs">السعر</label>
            <select className="input py-1.5" value={draft.priceType} onChange={(e) => onChange({ ...draft, priceType: e.target.value as any })}>
              <option value="original">الأصلي</option>
              <option value="custom">مخصص</option>
            </select>
          </div>
          {draft.priceType === 'custom' && (
              <div>
                <label className="label text-xs">السعر المخصص</label>
                <input className="input nums py-1.5" type="number" value={draft.customPrice} onChange={(e) => onChange({ ...draft, customPrice: e.target.value })} />
              </div>
          )}
          <div>
            <label className="label text-xs">الكمية</label>
            <input className="input nums py-1.5" type="number" min={1} value={draft.quantity} onChange={(e) => onChange({ ...draft, quantity: Math.max(1, +e.target.value) })} />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Checkbox id={`acc-${draft.product._id}`} checked={draft.hasAccessories} onCheckedChange={(checked) => onChange({ ...draft, hasAccessories: checked })} />
          <Label htmlFor={`acc-${draft.product._id}`}>أخذ ملحقات؟</Label>
        </div>
        {draft.hasAccessories && (
            <div className="mt-2 grid grid-cols-2 gap-3">
              <input className="input py-1.5" placeholder="وصف الملحقات (اختياري)" value={draft.accessoriesDesc} onChange={(e) => onChange({ ...draft, accessoriesDesc: e.target.value })} />
              <input className="input nums py-1.5" type="number" placeholder="تكلفة الملحقات *" value={draft.accessoriesCost} onChange={(e) => onChange({ ...draft, accessoriesCost: e.target.value })} />
            </div>
        )}

        {/* per-record note */}
        <div className="mt-3">
          <label className="label text-xs">ملاحظة (اختياري)</label>
          <input className="input py-1.5" placeholder="ملاحظة على هذه العملية…" value={draft.notes} onChange={(e) => onChange({ ...draft, notes: e.target.value })} />
        </div>

        <div className="mt-3 flex justify-between border-t border-line pt-2 text-sm">
          <span className="text-muted">البيع: <span className="nums">{shekel(sellingPrice * draft.quantity)}</span></span>
          <span className="font-semibold text-lime-hover">الربح: <span className="nums">{shekel(profit)}</span></span>
        </div>
      </div>
  );
}

// ---------- Detail + append record ----------
function SaleFileDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: file, isLoading } = useQuery({
    queryKey: ['sale-file', id],
    queryFn: async () => (await api.get(`/admin/sale-files/${id}`)).data,
  });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const append = useMutation({
    mutationFn: () => api.post(`/admin/sale-files/${id}/records`, draftToPayload(draft!)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sale-file', id] });
      qc.invalidateQueries({ queryKey: ['admin-sale-files'] });
      setDraft(null);
    },
    onError: (e) => setError((e as Error).message),
  });

  return (
      <Modal title="ملف البيع" onClose={onClose} maxWidth="max-w-2xl">
        {isLoading || !file ? (
            <div className="py-8 text-center text-muted">جارٍ التحميل…</div>
        ) : (
            <div className="space-y-4">
              <div className="rounded-xl bg-surface p-3 text-sm">
                {file.walkIn || !file.customer ? (
                    <div className="font-semibold">زبون محل</div>
                ) : (
                    <>
                      <div className="font-semibold">{file.customer?.name}</div>
                      <div className="nums text-muted">{file.customer?.phone}</div>
                    </>
                )}
                {/* file-level note removed */}
              </div>

              <div className="space-y-2">
                {file.records.map((r: any, i: number) => (
                    <div key={i} className="flex items-start justify-between rounded-xl border border-line p-3 text-sm">
                      <div className="flex items-start gap-2">
                        {r.productImageSnap && <img src={r.productImageSnap} alt="" className="h-9 w-9 rounded-lg object-cover" />}
                        <div>
                          <div className="flex items-center gap-2 font-medium">
                            {r.productNameSnap}
                            {r.productCodeSnap && <span className="nums rounded bg-surface px-1.5 py-0.5 text-xs text-muted">{r.productCodeSnap}</span>}
                          </div>
                          <div className="nums text-xs text-muted">
                            {r.quantity} × {shekel(r.sellingPrice)} {r.hasAccessories && r.accessoriesDesc && `· ملحقات: ${r.accessoriesDesc}`}
                          </div>
                          {r.notes && <div className="mt-1 text-xs text-muted">📝 {r.notes}</div>}
                        </div>
                      </div>
                      <span className="nums shrink-0 font-semibold text-lime-hover">{shekel(r.profit)}</span>
                    </div>
                ))}
              </div>

              <div className="flex justify-between rounded-xl bg-surface p-3 text-sm">
                <span>إجمالي البيع: <span className="nums font-bold">{shekel(file.totalSelling)}</span></span>
                <span>إجمالي الربح: <span className="nums font-bold text-lime-hover">{shekel(file.totalProfit)}</span></span>
              </div>

              <div className="border-t border-line pt-4">
                <h4 className="mb-2 text-sm font-bold text-muted">إضافة عملية جديدة لنفس العميل</h4>
                {!draft ? (
                    <ProductPicker onPick={(p) => setDraft(newDraft(p))} />
                ) : (
                    <>
                      <DraftRow draft={draft} onChange={setDraft} onRemove={() => setDraft(null)} />
                      <ErrorBox message={error} />
                      <button className="btn-primary mt-3 w-full" disabled={append.isPending} onClick={() => append.mutate()}>
                        {append.isPending ? 'جارٍ الإضافة…' : 'إضافة العملية'}
                      </button>
                    </>
                )}
              </div>
            </div>
        )}
      </Modal>
  );
}

function tab(active: boolean) {
  return `rounded-xl px-3 py-2 text-sm font-medium transition ${active ? 'bg-charcoal text-white' : 'border border-line hover:bg-surface'}`;
}