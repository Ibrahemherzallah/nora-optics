import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {Plus, Pencil, Trash2, Search} from 'lucide-react';
import { api } from '@/lib/api.ts';
import { Modal, ErrorBox, EmptyRow } from '../../components/admin/Modal';
import { CustomerPicker, PickedCustomer } from '../../components/admin/CustomerPicker';

type Side = { sph: string; cyl: string; axis: string; add: string; va: string };

const emptySide = (): Side => ({ sph: '', cyl: '', axis: '', add: '', va: '' });


const emptyRecord = () => ({
  right: emptySide(),
  left: emptySide(),
  ipd: '',
  source: 'external' as 'external' | 'internal' | 'old',
  doctorName: '',
  date: new Date().toISOString().slice(0, 10),
});


const SOURCE_LABELS: Record<string, string> = {
  external: 'فحص خارجي',
  internal: 'فحص داخلي',
  old: 'فحص قديم',
};

export function EyeExamsAdmin() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-eye-exams', search],  // ← add search to key
    queryFn: async () =>
        (await api.get(`/admin/eye-exams?search=${encodeURIComponent(search)}`)).data.data,
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/eye-exams/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-eye-exams'] }),
  });

  return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">فحوصات النظر</h1>
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus size={18} /> فحص جديد
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
                  <th className="p-3 text-right font-medium">الهاتف</th>
                  <th className="p-3 text-right font-medium">عدد الفحوصات</th>
                  <th className="p-3 text-right font-medium">آخر فحص</th>
                  <th className="w-24 p-3 font-medium">إجراءات</th>
                </tr>
                </thead>
                <tbody>
                {data?.map((e: any) => (
                    <tr
                        key={e._id}
                        className="cursor-pointer border-b border-line last:border-0 hover:bg-surface"
                        onClick={() => setOpenId(e._id)}
                    >
                      <td className="p-3 text-right font-medium">{e.customer?.name || '—'}</td>
                      <td className="p-3 text-right text-muted">
                        <span className="nums">{e.customer?.phone || '—'}</span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="nums">{e.records?.length || 0}</span>
                      </td>
                      <td className="p-3 text-right text-muted">
                    <span className="nums text-xs">
                      {e.records?.length
                          ? new Date(e.records[e.records.length - 1].createdAt).toLocaleDateString('en-GB')
                          : '—'}
                    </span>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-start gap-1">
                          <button
                              className="rounded-lg p-2 hover:bg-surface"
                              title="عرض / تعديل"
                              onClick={(ev) => { ev.stopPropagation(); setOpenId(e._id); }}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                              className="rounded-lg p-2 text-destructive hover:bg-red-50"
                              title="حذف"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                if (confirm(`حذف ملف فحوصات "${e.customer?.name}"؟`)) del.mutate(e._id);
                              }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                ))}
                {data?.length === 0 && <EmptyRow cols={5} text="لا توجد فحوصات بعد." />}
                </tbody>
              </table>
            </div>
        )}

        {open && (
            <ExamModal
                onClose={() => setOpen(false)}
                onExistingExam={(id) => { setOpen(false); setOpenId(id); }}
            />
        )}
        {openId && <ExamDetail id={openId} onClose={() => setOpenId(null)} />}
      </div>
  );
}

// ---------- Create modal ----------
function ExamModal({ onClose, onExistingExam }: { onClose: () => void; onExistingExam: (id: string) => void }) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [existingExamId, setExistingExamId] = useState<string | null>(null);
  const [linkMode, setLinkMode] = useState<'new' | 'existing'>('existing');
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [nc, setNc] = useState({ name: '', phone: '', age: '', address: '' });
  const [rec, setRec] = useState(emptyRecord());

  const needsDoctor = rec.source === 'external' || rec.source === 'internal';

  const phoneOk = nc.phone === '' || /^\d{10}$/.test(nc.phone);
  const canSave = (linkMode === 'existing' ? !!customer : nc.name.trim().length > 0 && phoneOk);

  const save = useMutation({
    mutationFn: () => {
      const payload: any = {
        record: {
          right: rec.right,
          left: rec.left,
          ipd: rec.ipd || undefined,
          source: rec.source,
          doctorName: needsDoctor ? rec.doctorName : undefined,
          date: rec.date || undefined,
          note: rec.note?.trim() || undefined,
        },
      };
      if (linkMode === 'existing' && customer) payload.customerId = customer._id;
      else payload.newCustomer = {
        name: nc.name,
        phone: nc.phone || undefined,
        age: nc.age ? Number(nc.age) : undefined,
        address: nc.address || undefined,
      };
      return api.post('/admin/eye-exams', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-eye-exams'] });
      onClose();
    },
    onError: (e: any) => {
      const raw = (e as Error).message;
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.examId) { setExistingExamId(parsed.examId); setError(parsed.message); return; }
      } catch { /* not structured */ }
      setError(raw);
    },
  });

  return (
      <Modal title="فحص نظر جديد" onClose={onClose} maxWidth="max-w-3xl">
        <div className="space-y-5">
          {/* Customer */}
          <div>
            <div className="mb-2 flex gap-2">
              <button onClick={() => setLinkMode('existing')} className={tab(linkMode === 'existing')}>ربط عميل موجود</button>
              <button onClick={() => setLinkMode('new')} className={tab(linkMode === 'new')}>عميل جديد</button>
            </div>
            {linkMode === 'existing' ? (
                <CustomerPicker value={customer} onPick={setCustomer} />
            ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">الاسم *</label>
                    <input className="input" value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">الهاتف (اختياري)</label>
                    <input
                        className={`input nums ${!phoneOk ? 'border-destructive' : ''}`}
                        inputMode="numeric"
                        placeholder="05XXXXXXXX"
                        value={nc.phone}
                        onChange={(e) => setNc({ ...nc, phone: e.target.value })}
                    />
                    {!phoneOk && <p className="mt-1 text-xs text-destructive">رقم الهاتف يجب أن يكون 10 أرقام</p>}
                  </div>
                  <div>
                    <label className="label">العمر</label>
                    <input className="input nums" type="number" value={nc.age} onChange={(e) => setNc({ ...nc, age: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">العنوان</label>
                    <input className="input" value={nc.address} onChange={(e) => setNc({ ...nc, address: e.target.value })} />
                  </div>
                </div>
            )}
          </div>

          {/* Prescription */}
          <PrescriptionForm rec={rec} onChange={setRec} />

          {existingExamId ? (
              <div className="rounded-xl bg-amber-50 p-3 text-sm">
                <p className="font-medium text-amber-800">يوجد ملف فحوصات لهذا العميل بالفعل.</p>
                <button className="btn-primary mt-2" onClick={() => onExistingExam(existingExamId)}>
                  فتح ملف الفحوصات وإضافة فحص جديد
                </button>
              </div>
          ) : (
              <ErrorBox message={error} />
          )}

          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={onClose}>إلغاء</button>
            <button className="btn-primary" disabled={!canSave || save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? 'جارٍ الحفظ…' : 'حفظ الفحص'}
            </button>
          </div>
        </div>
      </Modal>
  );
}

// ---------- Detail modal (shows all records + append) ----------
function ExamDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [rec, setRec] = useState(emptyRecord());
  const [error, setError] = useState<string | null>(null);

  // editing state
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editRec, setEditRec] = useState<ReturnType<typeof emptyRecord> | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const { data: exam, isLoading } = useQuery({
    queryKey: ['admin-eye-exam', id],
    queryFn: async () => (await api.get(`/admin/eye-exams/${id}`)).data,
  });

  const append = useMutation({
    mutationFn: () =>
        api.post(`/admin/eye-exams/${id}/records`, {
          right: rec.right,
          left: rec.left,
          ipd: rec.ipd || undefined,
          source: rec.source,
          doctorName: rec.source !== 'old' ? rec.doctorName : undefined,
          date: rec.date || undefined,
          note: rec.note?.trim() || undefined,   // ← add this
        }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-eye-exam', id] });
      qc.invalidateQueries({ queryKey: ['admin-eye-exams'] });
      setAdding(false);
      setRec(emptyRecord());
    },
    onError: (e) => setError((e as Error).message),
  });

  const editRecord = useMutation({
    mutationFn: ({ recordId, payload }: { recordId: string; payload: any }) =>
        api.patch(`/admin/eye-exams/${id}/records/${recordId}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-eye-exam', id] });
      qc.invalidateQueries({ queryKey: ['admin-eye-exams'] });
      setEditingRecordId(null);
      setEditRec(null);
    },
    onError: (e) => setEditError((e as Error).message),
  });

  function recordToState(r: any): ReturnType<typeof emptyRecord> {
    return {
      right: r.right ?? emptySide(),
      left: r.left ?? emptySide(),
      ipd: r.ipd ?? '',
      source: r.source ?? 'external',
      doctorName: r.doctorName ?? '',
      date: r.date
          ? new Date(r.date).toISOString().slice(0, 10)
          : new Date(r.createdAt).toISOString().slice(0, 10),
    };
  }


  return (
      <Modal title="ملف فحوصات النظر" onClose={onClose} maxWidth="max-w-3xl">
        {isLoading || !exam ? (
            <div className="py-8 text-center text-muted">جارٍ التحميل…</div>
        ) : (
            <div className="space-y-4">
              {/* Customer card */}
              <div className="rounded-xl bg-surface p-3 text-sm">
                <div className="font-semibold">{exam.customer?.name}</div>
                {exam.customer?.phone && <div className="nums text-muted">{exam.customer.phone}</div>}
              </div>

              {/* Records — newest first */}
              <div className="space-y-3">
                {[...exam.records].reverse().map((r: any) => (
                    <div key={r._id}>
                      {editingRecordId === r._id && editRec ? (
                          /* ── inline edit form ── */
                          <div className="rounded-xl border-2 border-lime p-3">
                            <div className="mb-3 flex items-center justify-between">
                              <span className="text-sm font-bold text-muted">تعديل الفحص</span>
                              <button
                                  className="text-xs text-muted hover:underline"
                                  onClick={() => { setEditingRecordId(null); setEditRec(null); setEditError(null); }}
                              >
                                إلغاء
                              </button>
                            </div>
                            <PrescriptionForm rec={editRec} onChange={setEditRec} />
                            {editError && <div className="mt-2 text-xs text-destructive">{editError}</div>}
                            <button
                                className="btn-primary mt-3 w-full"
                                disabled={editRecord.isPending}
                                onClick={() =>
                                    editRecord.mutate({
                                      recordId: r._id,
                                      payload: {
                                        right: editRec.right,
                                        left: editRec.left,
                                        ipd: editRec.ipd || undefined,
                                        source: editRec.source,
                                        doctorName: editRec.source !== 'old' ? editRec.doctorName : undefined,
                                        date: editRec.date || undefined,
                                        note: editRec.note || '',
                                      },
                                    })
                                }
                            >
                              {editRecord.isPending ? 'جارٍ الحفظ…' : 'حفظ التعديل'}
                            </button>
                          </div>
                      ) : (
                          /* ── read-only row ── */
                          <div className="rounded-xl border border-line p-3">
                            <div className="mb-2 flex items-center justify-between text-xs text-muted">
                      <span>
                        {SOURCE_LABELS[r.source]}
                        {r.doctorName ? ` · ${r.doctorName}` : ''}
                      </span>
                              <div className="flex items-center gap-2">
                        <span className="nums">
                          {new Date(r.date ?? r.createdAt).toLocaleDateString('en-GB')}
                        </span>
                                <button
                                    className="rounded-lg p-1 hover:bg-surface"
                                    title="تعديل"
                                    onClick={() => { setEditingRecordId(r._id); setEditRec(recordToState(r)); setEditError(null); }}
                                >
                                  <Pencil size={14} />
                                </button>
                              </div>
                            </div>
                            <PrescriptionTable right={r.right} left={r.left} ipd={r.ipd} />
                            {r.note && <p className="mt-2 text-xs text-muted">📝 {r.note}</p>}
                          </div>
                      )}
                    </div>
                ))}
                {exam.records.length === 0 && (
                    <div className="py-6 text-center text-sm text-muted">لا توجد قياسات بعد.</div>
                )}
              </div>

              {/* Append section */}
              <div className="border-t border-line pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-muted">إضافة فحص جديد</h4>
                  {!adding && (
                      <button className="btn-primary" onClick={() => setAdding(true)}>
                        <Plus size={16} /> إضافة
                      </button>
                  )}
                </div>
                {adding && (
                    <div className="space-y-4">
                      <PrescriptionForm rec={rec} onChange={setRec} />
                      <ErrorBox message={error} />
                      <div className="flex justify-end gap-2">
                        <button className="btn-ghost" onClick={() => { setAdding(false); setRec(emptyRecord()); }}>
                          إلغاء
                        </button>
                        <button className="btn-primary" disabled={append.isPending} onClick={() => append.mutate()}>
                          {append.isPending ? 'جارٍ الحفظ…' : 'حفظ الفحص'}
                        </button>
                      </div>
                    </div>
                )}
              </div>
            </div>
        )}
      </Modal>
  );
}

// ---------- Shared: prescription form (for create + append) ----------
type RecState = ReturnType<typeof emptyRecord>;

function PrescriptionForm({ rec, onChange }: { rec: RecState; onChange: (r: RecState) => void }) {
  const needsDoctor = rec.source === 'external' || rec.source === 'internal';
  return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">المصدر *</label>
            <select className="input" value={rec.source} onChange={(e) => onChange({ ...rec, source: e.target.value as any })}>
              <option value="external">فحص خارجي</option>
              <option value="internal">فحص داخلي</option>
              <option value="old">فحص قديم</option>
            </select>
          </div>
          {needsDoctor && (
              <div>
                <label className="label">اسم الطبيب (اختياري)</label>
                <input
                    className="input"
                    value={rec.doctorName}
                    onChange={(e) => onChange({ ...rec, doctorName: e.target.value })} />
              </div>
          )}
        </div>
        <div className="max-w-[220px]">
          <label className="label">تاريخ الفحص</label>
          <input
              type="date"
              className="input nums"
              value={rec.date}
              max={new Date().toISOString().slice(0, 10)}   // can't pick a future date
              onChange={(e) => onChange({ ...rec, date: e.target.value })}
          />
          {rec.date !== new Date().toISOString().slice(0, 10) && (
              <button
                  className="mt-1 text-xs text-lime-hover hover:underline"
                  onClick={() => onChange({ ...rec, date: new Date().toISOString().slice(0, 10) })}
              >
                استخدام تاريخ اليوم
              </button>
          )}
        </div>
        <label className="label">القياسات</label>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-center text-sm" style={{ direction: 'ltr' }}>
            <thead className="bg-surface text-muted">
            <tr>
              <th className="p-2"></th>
              <th className="p-2 font-medium">Sph</th>
              <th className="p-2 font-medium">Cyl</th>
              <th className="p-2 font-medium">Axis</th>
              <th className="p-2 font-medium">Add</th>
              <th className="p-2 font-medium">V.A.</th>
            </tr>
            </thead>
            <tbody>
            <SideRow
                label="Right (R)"
                side={rec.right}
                onChange={(s) => onChange({ ...rec, right: s })}
            />
            <SideRow
                label="Left (L)"
                side={rec.left}
                onChange={(s) => onChange({ ...rec, left: s })}
            />
            </tbody>
          </table>
        </div>
        <div className="max-w-[200px]">
          <label className="label">I.P.D</label>
          <input className="input nums" value={rec.ipd} onChange={(e) => onChange({ ...rec, ipd: e.target.value })} placeholder="مثال: 62" />
        </div>
        <div>
          <label className="label">ملاحظة (اختياري)</label>
          <input
              className="input"
              placeholder="ملاحظة على هذا الفحص…"
              value={rec.note}
              onChange={(e) => onChange({ ...rec, note: e.target.value })}
          />
        </div>
      </div>
  );
}

// ---------- Shared: read-only prescription table (for detail view) ----------
function PrescriptionTable({ right, left, ipd }: { right: any; left: any; ipd?: string }) {
  const keys: Array<{ key: string; label: string }> = [
    { key: 'sph', label: 'Sph' },
    { key: 'cyl', label: 'Cyl' },
    { key: 'axis', label: 'Axis' },
    { key: 'add', label: 'Add' },
    { key: 'va', label: 'V.A' },
  ];

  const val = (v: string | undefined) => (v && v.trim() ? v : '—');

  const Row = ({ label, side }: { label: string; side: any }) => (
      <tr className="border-t border-line">
        <td className="whitespace-nowrap p-2 text-right text-xs font-medium">{label}</td>
        {keys.map(({ key }) => (
            <td key={key} className="p-2 text-center text-sm">
              <span className="nums">{val(side?.[key])}</span>
            </td>
        ))}
      </tr>
  );

  return (
      <div>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm" style={{ direction: 'ltr' }}>
            <thead className="bg-surface text-muted">
            <tr>
              <th className="p-2 text-right"></th>
              {keys.map(({ label }) => (
                  <th key={label} className="p-2 font-medium text-center">{label}</th>
              ))}
            </tr>
            </thead>
            <tbody>
            <Row label="اليمنى (R)" side={right} />
            <Row label="اليسرى (L)" side={left} />
            </tbody>
          </table>
        </div>
        {ipd && (
            <p className="mt-1 text-right text-xs text-muted">
              I.P.D: <span className="nums">{ipd}</span>
            </p>
        )}
      </div>
  );
}

function SideRow({ label, side, onChange }: { label: string; side: Side; onChange: (s: Side) => void }) {
  const keys: (keyof Side)[] = ['sph', 'cyl', 'axis', 'add', 'va'];
  return (
      <tr className="border-t border-line">
        <td className="whitespace-nowrap p-2 text-right font-medium">{label}</td>
        {keys.map((k) => (
            <td key={k} className="p-1.5">
              <input
                  className="input nums px-2 py-1.5 text-center"
                  value={side[k]}
                  onChange={(e) => onChange({ ...side, [k]: e.target.value })}
              />
            </td>
        ))}
      </tr>
  );
}

function tab(active: boolean) {
  return `rounded-xl px-3 py-2 text-sm font-medium transition ${active ? 'bg-charcoal text-white' : 'border border-line hover:bg-surface'}`;
}