import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Eye, ShieldCheck, Truck, Sparkles } from 'lucide-react';
import { api } from '../../lib/api';
import { Category, PublicProduct, Paginated } from '../../lib/types';
import { ProductCard } from '../../components/store/ProductCard';
import { shekel } from '../../lib/format';

const discountPct = (p: PublicProduct) =>
  p.originalPrice > 0 ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;

export function Home() {
  const { data: cats } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get<{ data: Category[] }>('/categories')).data.data,
  });
  const { data: products } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: async () => (await api.get<Paginated<PublicProduct>>('/products?limit=8')).data.data,
  });
  const { data: offersRaw } = useQuery({
    queryKey: ['offers', 'home'],
    queryFn: async () => (await api.get<{ data: PublicProduct[] }>('/offers/products')).data.data,
  });

  // Best discount first so the feature card is the strongest deal.
  const offers = [...(offersRaw || [])].sort((a, b) => discountPct(b) - discountPct(a));
  const feature = offers[0];
  const restOffers = offers.slice(1, 4);

  return (
    <div>
      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden bg-charcoal text-charcoal-fg">
        {/* ambient lime glow */}
        <div className="floaty pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-lime/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-lime/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 md:grid-cols-2 md:py-28">
          <div className="fade-up">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-lime/30 bg-lime/10 px-3 py-1 text-sm text-lime">
              <Sparkles size={14} /> مركز نورا للبصريات
            </span>
            <h1 className="text-4xl font-extrabold leading-[1.15] md:text-6xl">
              رؤية أوضح،
              <br />
              <span className="text-lime">إطلالة أجمل</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-white/70">
              تشكيلة مختارة من النظارات الطبية والشمسية بأجود الخامات وأحدث الموديلات.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/products" className="btn-primary">
                تسوّق الآن <ArrowLeft size={18} />
              </Link>
              <Link to="/offers" className="btn-ghost border-white/20 text-white hover:bg-white/10">
                شاهد العروض
              </Link>
            </div>

            {/* trust signals */}
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/60">
              <span className="flex items-center gap-2"><Eye size={16} className="text-lime" /> فحص نظر مجاني</span>
              <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-lime" /> ضمان أصلي</span>
              <span className="flex items-center gap-2"><Truck size={16} className="text-lime" /> توصيل لكل المناطق</span>
            </div>
          </div>

          <div className="fade-up relative hidden justify-center md:flex" style={{ animationDelay: '0.15s' }}>
            <div className="absolute inset-0 m-auto h-72 w-72 rounded-full border border-lime/20" />
            <div className="absolute inset-0 m-auto h-56 w-56 rounded-full border border-lime/10" />
            <img
              src="https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=800"
              alt="نظارات نورا"
              className="relative aspect-[4/5] w-full max-w-sm rounded-[2rem] object-cover shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* ---------- OFFERS (prominent) ---------- */}
      {offers.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <span className="text-sm font-semibold uppercase tracking-wide text-lime-hover">وفّر أكثر</span>
              <h2 className="mt-1 text-3xl font-extrabold">عروض حصرية</h2>
            </div>
            <Link to="/offers" className="hidden text-sm font-medium text-lime-hover hover:underline md:inline">
              عرض كل العروض ←
            </Link>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Feature card — strongest deal */}
            {feature && (
              <Link
                to={`/products/${feature.id}`}
                className="group relative flex min-h-[300px] flex-col justify-end overflow-hidden rounded-3xl bg-charcoal p-7 text-white shadow-card transition hover:shadow-cardHover"
              >
                {feature.colors[0]?.images[0] && (
                  <img
                    src={feature.colors[0].images[0]}
                    alt={feature.name}
                    className="absolute inset-0 h-full w-full object-cover opacity-55 transition duration-500 group-hover:scale-105 group-hover:opacity-65"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/60 to-transparent" />
                <div className="absolute right-6 top-6">
                  <span className="nums rounded-full bg-lime px-3.5 py-1.5 text-base font-extrabold text-lime-fg">
                    -{discountPct(feature)}%
                  </span>
                </div>
                <div className="relative">
                  <h3 className="text-2xl font-bold">{feature.name}</h3>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="nums text-2xl font-extrabold text-lime">{shekel(feature.price)}</span>
                    <span className="nums text-white/50 line-through">{shekel(feature.originalPrice)}</span>
                  </div>
                </div>
              </Link>
            )}

            {/* Smaller offer cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {restOffers.map((p) => (
                <Link
                  key={p.id}
                  to={`/products/${p.id}`}
                  className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-line bg-white p-4 shadow-card transition hover:shadow-cardHover"
                >
                  {p.colors[0]?.images[0] && (
                    <img src={p.colors[0].images[0]} alt={p.name} className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{p.name}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="nums font-bold text-lime-hover">{shekel(p.price)}</span>
                      <span className="nums text-xs text-muted line-through">{shekel(p.originalPrice)}</span>
                    </div>
                  </div>
                  <span className="nums absolute left-3 top-3 rounded-full bg-lime/15 px-2 py-0.5 text-xs font-bold text-lime-hover">
                    -{discountPct(p)}%
                  </span>
                </Link>
              ))}
              {restOffers.length === 0 && feature && (
                <div className="flex items-center justify-center rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted sm:col-span-2">
                  المزيد من العروض قريباً
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ---------- CATEGORIES ---------- */}
      {!!cats?.length && (
        <section className="bg-surface py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="mb-8 text-3xl font-extrabold">تصفّح الأصناف</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {cats.map((c) => (
                <Link
                  key={c._id}
                  to={`/products?category=${c._id}`}
                  className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-charcoal"
                >
                  <img src={c.image} alt={c.name} className="h-full w-full object-cover opacity-90 transition duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-4">
                    <span className="font-bold text-white">{c.name}</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-lime text-lime-fg opacity-0 transition group-hover:opacity-100">
                      <ArrowLeft size={16} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- FEATURED PRODUCTS ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="text-3xl font-extrabold">أحدث المنتجات</h2>
          <Link to="/products" className="text-sm font-medium text-lime-hover hover:underline">
            عرض الكل ←
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {products?.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </section>

      {/* ---------- VALUE BAND ---------- */}
      <section className="bg-charcoal text-charcoal-fg">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-3">
          {[
            { icon: Eye, title: 'فحص نظر متخصص', text: 'فحص دقيق على يد مختصين لاختيار العدسات المناسبة.' },
            { icon: ShieldCheck, title: 'منتجات أصلية', text: 'إطارات وعدسات أصلية بضمان معتمد.' },
            { icon: Truck, title: 'توصيل سريع', text: 'الضفة والقدس وأراضي ٤٨ — يُحتسب التوصيل حسب المنطقة.' },
          ].map((v) => (
            <div key={v.title} className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-lime/15 text-lime">
                <v.icon size={22} />
              </div>
              <div>
                <h3 className="font-bold">{v.title}</h3>
                <p className="mt-1 text-sm text-white/65">{v.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
