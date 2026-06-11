import { Link } from 'react-router-dom';
import { PublicProduct } from '../../lib/types';
import { shekel } from '../../lib/format';

export function ProductCard({ p }: { p: PublicProduct }) {
  const image = p.colors[0]?.images[0];
  return (
    <Link
      to={`/products/${p.id}`}
      className="group relative block overflow-hidden rounded-2xl border border-line bg-white shadow-card transition hover:shadow-cardHover"
    >
      <div className="relative aspect-square overflow-hidden bg-surface">
        {image ? (
          <img src={image} alt={p.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">لا توجد صورة</div>
        )}
        {p.onOffer && (
          <span className="absolute right-3 top-3 rounded-full bg-lime px-2.5 py-1 text-xs font-bold text-lime-fg">عرض</span>
        )}
        {p.isSoldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <span className="rounded-full bg-charcoal px-4 py-1.5 text-sm font-bold text-white">نفذت الكمية</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="truncate text-sm font-semibold">{p.name}</div>
        <div className="nums mt-0.5 text-xs text-muted">{p.code}</div>
        <div className="mt-2 flex items-center gap-2">
          <span className="nums font-bold text-lime-hover">{shekel(p.price)}</span>
          {p.onOffer && <span className="nums text-xs text-muted line-through">{shekel(p.originalPrice)}</span>}
        </div>
      </div>
    </Link>
  );
}
