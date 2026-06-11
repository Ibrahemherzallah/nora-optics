import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Check } from 'lucide-react';
import { api } from '../../lib/api';

export interface PickedCustomer {
  _id: string;
  name: string;
  phone: string;
}

export function CustomerPicker({ value, onPick }: { value?: PickedCustomer | null; onPick: (c: PickedCustomer | null) => void }) {
  const [search, setSearch] = useState('');

  const { data, isFetching } = useQuery({
    queryKey: ['customer-search', search],
    queryFn: async () => (await api.get(`/admin/customers?search=${encodeURIComponent(search)}`)).data.data as PickedCustomer[],
    enabled: search.length >= 1,
  });

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-lime bg-lime/10 p-3">
        <div className="text-sm">
          <span className="font-semibold">{value.name}</span>
          <span className="nums mr-2 text-muted"> · {value.phone}</span>
        </div>
        <button className="text-sm text-destructive hover:underline" onClick={() => onPick(null)}>
          إلغاء
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
        <input className="input pr-9" placeholder="ابحث بالاسم أو الهاتف" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {search.length >= 1 && (
        <div className="mt-1 max-h-40 overflow-y-auto rounded-xl border border-line">
          {isFetching && <div className="p-3 text-center text-xs text-muted">جارٍ البحث…</div>}
          {data?.map((c) => (
            <button
              key={c._id}
              onClick={() => onPick(c)}
              className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-surface"
            >
              <span>
                {c.name} <span className="nums text-muted">· {c.phone}</span>
              </span>
              <Check size={14} className="text-lime" />
            </button>
          ))}
          {data?.length === 0 && !isFetching && <div className="p-3 text-center text-xs text-muted">لا يوجد عميل مطابق</div>}
        </div>
      )}
    </div>
  );
}
