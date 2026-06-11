import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { PublicProduct } from '../../lib/types';
import { ProductCard } from '../../components/store/ProductCard';

export function Offers() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['offers', 'all'],
    queryFn: async () => (await api.get<{ data: PublicProduct[] }>('/offers/products')).data.data,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-2 inline-block rounded-full bg-lime/15 px-3 py-1 text-sm text-lime-hover">وفّر أكثر</div>
      <h1 className="mb-6 text-2xl font-bold">العروض الحالية</h1>

      {isLoading && <div className="py-16 text-center text-muted">جارٍ التحميل…</div>}
      {isError && <div className="rounded-xl bg-red-50 p-6 text-center text-destructive">{(error as Error).message}</div>}
      {data && data.length === 0 && (
        <div className="rounded-2xl border border-line bg-surface p-12 text-center text-muted">
          لا توجد عروض فعّالة حالياً. تابعنا قريباً.
        </div>
      )}
      {data && data.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {data.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
