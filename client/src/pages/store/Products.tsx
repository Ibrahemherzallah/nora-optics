import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api } from '@/lib/api.ts';
import { Category, PublicProduct, Paginated } from '@/lib/types.ts';
import { ProductCard } from '../../components/store/ProductCard';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export function Products() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || '';
  const search   = params.get('search')   || '';
  const inOffer  = params.get('inOffer')  === 'true';
  const inStock  = params.get('inStock')  === 'true';

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
      if (search)   qs.set('search',   search);
      if (inOffer)  qs.set('inOffer',  'true');
      if (inStock)  qs.set('inStock',  'true');
      qs.set('limit', '24');
      return (await api.get<Paginated<PublicProduct>>(`/products?${qs}`)).data;
    },
  });

  return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">المنتجات</h1>

        {/* ── Filters bar ── */}
        <div className="mb-6 flex flex-wrap items-center gap-3">

          {/* Search */}
          <div className="relative flex-1 md:max-w-xs">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
                className="input pr-10"
                placeholder="ابحث بالاسم أو الكود"
                defaultValue={search}
                onChange={(e) => setParam('search', e.target.value || null)}
            />
          </div>

          {/* Category dropdown — shadcn-style Select */}
          <div className="w-full md:w-52">
            <Select value={category || 'all'} onValueChange={(v) => setParam('category', v === 'all' ? null : v)}>
              <SelectTrigger>
            <span>
              {category
                  ? (cats?.find((c) => c._id === category)?.name ?? category)
                  : 'كل الأصناف'}
            </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأصناف</SelectItem>
                {cats?.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Checkboxes */}
          <div className="flex items-center gap-2">
            <Checkbox
                id="inOffer"
                checked={inOffer}
                onCheckedChange={(checked) => setParam('inOffer', checked ? 'true' : null)}
            />
            <Label htmlFor="inOffer">عروض فقط</Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
                id="inStock"
                checked={inStock}
                onCheckedChange={(checked) => setParam('inStock', checked ? 'true' : null)}
            />
            <Label htmlFor="inStock">المتوفر فقط</Label>
          </div>
        </div>

        {/* ── Results ── */}
        {isLoading && <GridSkeleton />}

        {isError && (
            <div className="rounded-xl bg-red-50 p-6 text-center text-destructive">
              {(error as Error).message}
            </div>
        )}

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
