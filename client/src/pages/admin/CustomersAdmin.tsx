import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, FileText, Eye, User } from 'lucide-react';
import { api } from '@/lib/api.ts';
import { shekel } from '@/lib/format.ts';

export function CustomersAdmin() {
    const [search, setSearch] = useState('');

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
                        </tr>
                        </thead>
                        <tbody>
                        {data?.data?.map((c: any) => (
                            <tr key={c._id} className="border-b border-line last:border-0">
                                {/* Customer */}
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

                                {/* Phone */}
                                <td className="p-3 text-right">
                                    <span className="nums text-muted">{c.phone || '—'}</span>
                                </td>

                                {/* Sale file */}
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

                                {/* Eye exam */}
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

                                {/* Source */}
                                <td className="p-3 text-right">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                        c.source === 'online'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-surface text-muted'
                    }`}>
                      {c.source === 'online' ? 'أونلاين' : 'المحل'}
                    </span>
                                </td>
                            </tr>
                        ))}
                        {data?.data?.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-12 text-center text-muted">
                                    لا يوجد عملاء بعد.
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}