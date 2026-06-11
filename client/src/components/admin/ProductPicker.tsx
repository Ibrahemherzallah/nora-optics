import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api } from '../../lib/api';
import { shekel } from '../../lib/format';

export interface PickedProduct {
  _id: string;
  name: string;
  code: string;
  price: number;
  cost: number;
  image?: string;
}

export function ProductPicker({ onPick }: { onPick: (p: PickedProduct) => void }) {
  const [search, setSearch] = useState('');

  const { data, isFetching } = useQuery({
    queryKey: ['pos-product-search', search],
    queryFn: async () => (await api.get(`/admin/products?search=${encodeURIComponent(search)}&limit=15`)).data.data,
    enabled: search.length >= 1,
  });

  return (
    <div>
      <div className="relative">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
        <input className="input pr-9" placeholder="ابحث عن منتج بالاسم أو الكود" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {search.length >= 1 && (
        <div className="mt-1 max-h-44 overflow-y-auto rounded-xl border border-line">
          {isFetching && <div className="p-3 text-center text-xs text-muted">جارٍ البحث…</div>}
          {data?.map((p: any) => (
            <button
              key={p._id}
              onClick={() => {
                onPick({ _id: p._id, name: p.name, code: p.code, price: p.price, cost: p.cost, image: p.colors?.[0]?.images?.[0] });
                setSearch('');
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-right text-sm hover:bg-surface"
            >
              {p.colors?.[0]?.images?.[0] && <img src={p.colors[0].images[0]} alt="" className="h-9 w-9 rounded-lg object-cover" />}
              <span className="flex-1">
                {p.name} <span className="nums text-xs text-muted">· {p.code}</span>
              </span>
              <span className="nums text-xs text-muted">{shekel(p.price)}</span>
            </button>
          ))}
          {data?.length === 0 && !isFetching && <div className="p-3 text-center text-xs text-muted">لا يوجد منتج مطابق</div>}
        </div>
      )}
    </div>
  );
}
