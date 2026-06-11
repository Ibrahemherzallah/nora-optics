import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '../../lib/api';
import { Modal, ErrorBox, EmptyRow } from '../../components/admin/Modal';
import { CustomerPicker, PickedCustomer } from '../../components/admin/CustomerPicker';

type Side = { sph: string; cyl: string; axis: string; add: string; va: string };
const emptySide = (): Side => ({ sph: '', cyl: '', axis: '', add: '', va: '' });

const SOURCE_LABELS: Record<string, string> = { external: 'فحص خارجي', internal: 'فحص داخلي', old: 'فحص قديم' };

export function EyeExamsAdmin() {
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-eye-exams'],
    queryFn: async () => (await api.get('/admin/eye-exams')).data.data,
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">فحوصات النظر</h1>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Plus size={18} /> فحص جديد
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted">جارٍ التحميل…</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface text-right text-muted">
              <tr>
                <th className="p-3 font-medium">الاسم</th>
                <th className="p-3 font-medium">الهاتف</th>
                <th className="p-3 font-medium">المصدر</th>
                <th className="p-3 font-medium">الطبيب</th>
                <th className="p-3 font-medium">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((e: any) => (
                <tr key={e._id} className="border-b border-line last:border-0">
                  <td className="p-3 font-medium">{e.customer?.name || e.name || '—'}</td>
                  <td className="nums p-3 text-muted">{e.customer?.phone || e.phone || '—'}</td>
                  <td className="p-3">{SOURCE_LABELS[e.source]}</td>
                  <td className="p-3 text-muted">{e.doctorName || '—'}</td>
                  <td className="nums p-3 text-xs text-muted">{new Date(e.createdAt).toLocaleDateString('en-GB')}</td>
                </tr>
              ))}
              {data?.length === 0 && <EmptyRow cols={5} text="لا توجد فحوصات بعد." />}
            </tbody>
          </table>
        </div>
      )}

      {open && <ExamModal onClose={() => setOpen(false)} />}
    </div>
  );
}

function ExamModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [linkMode, setLinkMode] = useState<'new' | 'existing'>('new');
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [address, setAddress] = useState('');
  const [right, setRight] = useState<Side>(emptySide());
  const [left, setLeft] = useState<Side>(emptySide());
  const [ipd, setIpd] = useState('');
  const [source, setSource] = useState<'external' | 'internal' | 'old'>('external');
  const [doctorName, setDoctorName] = useState('');

  const needsDoctor = source === 'external' || source === 'internal';

  const save = useMutation({
    mutationFn: () => {
      const payload: any = { right, left, ipd: ipd || undefined, source };
      if (needsDoctor) payload.doctorName = doctorName;
      if (linkMode === 'existing' && customer) payload.customer = customer._id;
      else {
        payload.name = name;
        payload.phone = phone || undefined;
        payload.age = age ? Number(age) : undefined;
        payload.address = address || undefined;
      }
      return api.post('/admin/eye-exams', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-eye-exams'] });
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <Modal title="فحص نظر جديد" onClose={onClose} maxWidth="max-w-3xl">
      <div className="space-y-5">
        {/* Customer linkage */}
        <div>
          <div className="mb-2 flex gap-2">
            <button onClick={() => setLinkMode('new')} className={tab(linkMode === 'new')}>
              عميل جديد / بدون ربط
            </button>
            <button onClick={() => setLinkMode('existing')} className={tab(linkMode === 'existing')}>
              ربط عميل موجود
            </button>
          </div>
          {linkMode === 'existing' ? (
            <CustomerPicker value={customer} onPick={setCustomer} />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">الاسم *</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="label">الهاتف *</label>
                <input className="input nums" inputMode="numeric" placeholder="05XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <label className="label">العمر</label>
                <input className="input nums" type="number" value={age} onChange={(e) => setAge(e.target.value)} />
              </div>
              <div>
                <label className="label">العنوان</label>
                <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {/* Prescription table */}
        <div>
          <label className="label">القياسات</label>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-center text-sm">
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
                <SideRow label="العين اليمنى (R)" side={right} onChange={setRight} />
                <SideRow label="العين اليسرى (L)" side={left} onChange={setLeft} />
              </tbody>
            </table>
          </div>
          <div className="mt-3 max-w-[200px]">
            <label className="label">I.P.D</label>
            <input className="input nums" value={ipd} onChange={(e) => setIpd(e.target.value)} placeholder="مثال: 62" />
          </div>
        </div>

        {/* Source + doctor */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">المصدر *</label>
            <select className="input" value={source} onChange={(e) => setSource(e.target.value as any)}>
              <option value="external">فحص خارجي</option>
              <option value="internal">فحص داخلي</option>
              <option value="old">فحص قديم</option>
            </select>
          </div>
          {needsDoctor && (
            <div>
              <label className="label">اسم الطبيب *</label>
              <input className="input" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} />
            </div>
          )}
        </div>

        <ErrorBox message={error} />
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>
            إلغاء
          </button>
          <button className="btn-primary" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? 'جارٍ الحفظ…' : 'حفظ الفحص'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function SideRow({ label, side, onChange }: { label: string; side: Side; onChange: (s: Side) => void }) {
  const keys: (keyof Side)[] = ['sph', 'cyl', 'axis', 'add', 'va'];
  return (
    <tr className="border-t border-line">
      <td className="whitespace-nowrap p-2 text-right font-medium">{label}</td>
      {keys.map((k) => (
        <td key={k} className="p-1.5">
          <input className="input nums px-2 py-1.5 text-center" value={side[k]} onChange={(e) => onChange({ ...side, [k]: e.target.value })} />
        </td>
      ))}
    </tr>
  );
}

function tab(active: boolean) {
  return `rounded-xl px-3 py-2 text-sm font-medium transition ${active ? 'bg-charcoal text-white' : 'border border-line hover:bg-surface'}`;
}
