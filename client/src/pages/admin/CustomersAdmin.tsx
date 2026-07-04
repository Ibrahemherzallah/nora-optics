import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, FileText, Eye, User, Pencil, X } from 'lucide-react';
import { api } from '@/lib/api.ts';
import { shekel } from '@/lib/format.ts';

interface CustomerForm {
    _id: string;
    name: string;
    phone: string;
    address: string;
    age: string;
    sex: string;
}

export function CustomersAdmin() {
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState<CustomerForm | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ['admin-customers', search],
        queryFn: async () =>
            (await api.get(`/admin/customers-list?search=${encodeURIComponent(search)}`)).data,
    });

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold">العملاء</h1>
                <span className="nums rounded-full bg-surface px-3 py-1 text-sm text-muted">
          {data?.total ?? '—'} عميل
        </span>
            </div>

            <div className="relative mb-4 md:max-w-xs">
                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                    className="input pr-9"
                    placeholder="ابحث بالاسم أو الهاتف"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
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
                            <th className="p-3 text-right font-medium">ملف البيع</th>
                            <th className="p-3 text-right font-medium">فحص النظر</th>
                            <th className="p-3 text-right font-medium">المصدر</th>
                            <th className="w-16 p-3 font-medium"></th>
                        </tr>
                        </thead>
                        <tbody>
                        {data?.data?.map((c: any) => (
                            <tr key={c._id} className="border-b border-line last:border-0">
                                <td className="p-3 text-right">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-muted">
                                            <User size={14} />
                                        </div>
                                        <div>
                                            <div className="font-medium">{c.name}</div>
                                            {c.address && <div className="text-xs text-muted">{c.address}</div>}
                                        </div>
                                    </div>
                                </td>

                                <td className="p-3 text-right">
                                    <span className="nums text-muted">{c.phone || '—'}</span>
                                </td>

                                <td className="p-3 text-right">
                                    {c.saleFile ? (
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-1.5">
                                                <FileText size={13} className="text-lime-hover" />
                                                <span className="font-medium text-lime-hover">
                            <span className="nums">{c.saleFile.records?.length || 0}</span> عملية
                          </span>
                                            </div>
                                            <div className="nums text-xs text-muted">
                                                بيع {shekel(c.saleFile.totalSelling)} · ربح {shekel(c.saleFile.totalProfit)}
                                            </div>
                                            {c.saleFile.isVoided && (
                                                <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-destructive">ملغي</span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-muted">—</span>
                                    )}
                                </td>

                                <td className="p-3 text-right">
                                    {c.eyeExam ? (
                                        <div className="flex items-center gap-1.5">
                                            <Eye size={13} className="text-blue-500" />
                                            <span className="font-medium text-blue-600">
                          <span className="nums">{c.eyeExam.records?.length || 0}</span> فحص
                        </span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-muted">—</span>
                                    )}
                                </td>

                                <td className="p-3 text-right">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                        c.source === 'online' ? 'bg-blue-100 text-blue-700' : 'bg-surface text-muted'
                    }`}>
                      {c.source === 'online' ? 'أونلاين' : 'المحل'}
                    </span>
                                </td>

                                <td className="p-3">
                                    <button
                                        className="rounded-lg p-2 hover:bg-surface"
                                        title="تعديل"
                                        onClick={() =>
                                            setEditing({
                                                _id: c._id,
                                                name: c.name || '',
                                                phone: c.phone || '',
                                                address: c.address || '',
                                                age: c.age != null ? String(c.age) : '',
                                                sex: c.sex || '',
                                            })
                                        }
                                    >
                                        <Pencil size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {data?.data?.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-12 text-center text-muted">
                                    لا يوجد عملاء بعد.
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            )}

            {editing && (
                <CustomerEditModal
                    form={editing}
                    onClose={() => setEditing(null)}
                />
            )}
        </div>
    );
}

function CustomerEditModal({ form, onClose }: { form: CustomerForm; onClose: () => void }) {
    const qc = useQueryClient();
    const [state, setState] = useState(form);
    const [error, setError] = useState<string | null>(null);

    const phoneOk = state.phone === '' || /^\d{10}$/.test(state.phone);

    const save = useMutation({
        mutationFn: () =>
            api.put(`/admin/customers/${state._id}`, {
                name: state.name.trim(),
                phone: state.phone.trim() || undefined,
                address: state.address.trim() || undefined,
                age: state.age ? Number(state.age) : undefined,
                sex: state.sex || undefined,
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin-customers'] });
            onClose();
        },
        onError: (e) => setError((e as Error).message),
    });

    const canSave = state.name.trim().length > 0 && phoneOk && !save.isPending;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-charcoal/40 p-4">
            <div className="my-8 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold">تعديل بيانات العميل</h2>
                    <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-surface">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="label">الاسم *</label>
                        <input
                            className="input"
                            value={state.name}
                            onChange={(e) => setState({ ...state, name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="label">الهاتف (اختياري)</label>
                        <input
                            className={`input nums ${!phoneOk ? 'border-destructive' : ''}`}
                            inputMode="numeric"
                            placeholder="05XXXXXXXX"
                            value={state.phone}
                            onChange={(e) => setState({ ...state, phone: e.target.value })}
                        />
                        {!phoneOk && (
                            <p className="mt-1 text-xs text-destructive">رقم الهاتف يجب أن يكون 10 أرقام</p>
                        )}
                    </div>

                    <div>
                        <label className="label">العنوان</label>
                        <input
                            className="input"
                            value={state.address}
                            onChange={(e) => setState({ ...state, address: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">العمر</label>
                            <input
                                className="input nums"
                                type="number"
                                min={0}
                                value={state.age}
                                onChange={(e) => setState({ ...state, age: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="label">الجنس</label>
                            <select
                                className="input"
                                value={state.sex}
                                onChange={(e) => setState({ ...state, sex: e.target.value })}
                            >
                                <option value="">غير محدد</option>
                                <option value="male">ذكر</option>
                                <option value="female">أنثى</option>
                            </select>
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-xl bg-red-50 p-3 text-sm text-destructive">{error}</div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <button className="btn-ghost" onClick={onClose}>إلغاء</button>
                        <button className="btn-primary" disabled={!canSave} onClick={() => save.mutate()}>
                            {save.isPending ? 'جارٍ الحفظ…' : 'حفظ'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}