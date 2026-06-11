import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api } from '../../lib/api';
import { Category, PublicProduct, Paginated } from '../../lib/types';
import { ProductCard } from '../../components/store/ProductCard';

export function Products() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || '';
  const search = params.get('search') || '';
  const inOffer = params.get('inOffer') === 'true';
  const inStock = params.get('inStock') === 'true';

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };

  const { data: cats } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get<{ data: Category[] }>('/categories')).data.data,
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['products', category, search, inOffer, inStock],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (category) qs.set('category', category);
      if (search) qs.set('search', search);
      if (inOffer) qs.set('inOffer', 'true');
      if (inStock) qs.set('inStock', 'true');
      qs.set('limit', '24');
      return (await api.get<Paginated<PublicProduct>>(`/products?${qs}`)).data;
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">المنتجات</h1>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 md:max-w-xs">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input pr-10"
            placeholder="ابحث بالاسم أو الكود"
            defaultValue={search}
            onChange={(e) => setParam('search', e.target.value || null)}
          />
        </div>
        <select className="input md:max-w-[180px]" value={category} onChange={(e) => setParam('category', e.target.value || null)}>
          <option value="">كل الأصناف</option>
          {cats?.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={inOffer} onChange={(e) => setParam('inOffer', e.target.checked ? 'true' : null)} className="accent-lime" />
          عروض فقط
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={inStock} onChange={(e) => setParam('inStock', e.target.checked ? 'true' : null)} className="accent-lime" />
          المتوفر فقط
        </label>
      </div>

      {isLoading && <GridSkeleton />}
      {isError && <div className="rounded-xl bg-red-50 p-6 text-center text-destructive">{(error as Error).message}</div>}
      {data && data.data.length === 0 && (
        <div className="rounded-2xl border border-line bg-surface p-12 text-center text-muted">
          لا توجد منتجات مطابقة. جرّب تعديل البحث أو الفلاتر.
        </div>
      )}
      {data && data.data.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {data.data.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="aspect-square animate-pulse rounded-2xl bg-surface" />
      ))}
    </div>
  );
}
