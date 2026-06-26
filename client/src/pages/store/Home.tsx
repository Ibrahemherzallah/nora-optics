import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Eye, ShieldCheck, Truck, Sparkles, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api.ts';
import { Category, PublicProduct, Paginated } from '@/lib/types.ts';
import { ProductCard } from '../../components/store/ProductCard';
import { shekel } from '@/lib/format.ts';

const discountPct = (p: PublicProduct) =>
    p.originalPrice > 0 ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;

/* Scroll-reveal: blur + slide-up as the element enters the viewport */
function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setShown(true), io.disconnect()), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
      <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={`transition-all duration-700 ease-out ${shown ? 'opacity-100 translate-y-0 blur-0' : 'translate-y-8 opacity-0 blur-[8px]'} ${className}`}>
        {children}
      </div>
  );
}

/* Progress 0..1 over the first viewport — drives the hero scroll animation */
function useScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setP(Math.min(1, window.scrollY / (window.innerHeight * 0.85))));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);
  return p;
}

export function Home() {
  const p = useScrollProgress();
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

  const offers = [...(offersRaw || [])].sort((a, b) => discountPct(b) - discountPct(a));
  const feature = offers[0];
  const restOffers = offers.slice(1, 4);

  const heroStyle: React.CSSProperties = {
    transform: `translateY(${p * 50}px) scale(${1 - p * 0.04})`,
    opacity: 1 - p * 1.1,
    filter: `blur(${p * 4}px)`,
    willChange: 'transform, opacity, filter',
  };

  return (
      <div>
        {/* ============ HERO ============ */}
        <section className="relative flex min-h-[92vh] items-center overflow-hidden">
          <style>{`@keyframes heroZoom{from{transform:scale(1)}to{transform:scale(1.1)}}.hero-zoom{animation:heroZoom 22s ease-in-out infinite alternate}@media (prefers-reduced-motion:reduce){.hero-zoom{animation:none}}`}</style>

          {/* background image with a slow cinematic zoom */}
          <img src="https://images.unsplash.com/photo-1577803645773-f96470509666?w=1600" alt="" className="hero-zoom absolute inset-0 h-full w-full object-cover" />
          {/* layered gradients: readable on the text side, image clear on the other */}
          <div className="absolute inset-0 bg-gradient-to-l from-charcoal/90 via-charcoal/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/45 via-transparent to-charcoal/20" />
          {/* ambient lime glow */}
          <div className="floaty pointer-events-none absolute right-16 top-1/4 h-72 w-72 rounded-full bg-lime/20 blur-[120px]" />

          <div className="relative z-10 mx-auto w-full max-w-6xl px-6">
            <div style={heroStyle} className="fade-up max-w-md border-r-2 border-lime/70 pr-5 text-right md:pr-7">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-sm text-white backdrop-blur">
              <Sparkles size={14} className="text-lime" /> مركز نورا للبصريات
            </span>
              <h1 className="mt-5 text-5xl font-extrabold leading-[1.05] tracking-tight text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.65)] md:text-6xl">
                رؤية أوضح،
                <br />
                <span className="text-lime">إطلالة أجمل</span>
              </h1>
              <p className="mt-5 max-w-sm leading-relaxed text-white/85 drop-shadow">
                تشكيلة مختارة من النظارات الطبية والشمسية بأجود الخامات وأحدث الموديلات.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/products" className="btn-primary shadow-lg shadow-lime/20">تسوّق الآن <ArrowLeft size={18} /></Link>
                <Link to="/offers" className="btn-ghost border-white/30 text-white backdrop-blur hover:bg-white/10">شاهد العروض</Link>
              </div>
              {/* trust row */}
              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/75">
                <span className="flex items-center gap-1.5"><Eye size={14} className="text-lime" /> فحص نظر مجاني</span>
                <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-lime" /> ضمان أصلي</span>
                <span className="flex items-center gap-1.5"><Truck size={14} className="text-lime" /> توصيل لكل المناطق</span>
              </div>
            </div>
          </div>

          {/* scroll hint */}
          <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-1 text-xs tracking-widest text-white/60" style={{ opacity: 1 - p * 2 }}>
            مرّر للأسفل
            <ChevronDown size={18} className="animate-bounce" />
          </div>
        </section>

        {/* ============ OFFERS ============ */}
        {offers.length > 0 && (
            <section className="mx-auto max-w-6xl px-4 py-20">
              <Reveal className="mb-8">
                <span className="text-sm font-semibold uppercase tracking-[0.2em] text-lime-hover">وفّر أكثر</span>
                <h2 className="mt-2 text-3xl font-extrabold md:text-4xl">عروض حصرية</h2>
              </Reveal>
              <div className="grid gap-5 lg:grid-cols-2">
                {feature && (
                    <Reveal>
                      <Link to={`/products/${feature.id}`} className="group relative flex min-h-[320px] flex-col justify-end overflow-hidden rounded-3xl bg-charcoal p-7 text-white shadow-card transition hover:shadow-cardHover">
                        {feature.colors[0]?.images[0] && <img src={feature.colors[0].images[0]} alt={feature.name} className="absolute inset-0 h-full w-full object-cover opacity-55 transition duration-500 group-hover:scale-105 group-hover:opacity-65" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/60 to-transparent" />
                        <div className="absolute right-6 top-6"><span className="nums rounded-full bg-lime px-3.5 py-1.5 text-base font-extrabold text-lime-fg">-{discountPct(feature)}%</span></div>
                        <div className="relative">
                          <h3 className="text-2xl font-bold">{feature.name}</h3>
                          <div className="mt-2 flex items-center gap-3">
                            <span className="nums text-2xl font-extrabold text-lime">{shekel(feature.price)}</span>
                            <span className="nums text-white/50 line-through">{shekel(feature.originalPrice)}</span>
                          </div>
                        </div>
                      </Link>
                    </Reveal>
                )}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {restOffers.map((pr, i) => (
                      <Reveal key={pr.id} delay={i * 100}>
                        <Link to={`/products/${pr.id}`} className="group relative flex h-full items-center gap-4 overflow-hidden rounded-2xl border border-line bg-white p-4 shadow-card transition hover:shadow-cardHover">
                          {pr.colors[0]?.images[0] && <img src={pr.colors[0].images[0]} alt={pr.name} className="h-20 w-20 shrink-0 rounded-xl object-cover" />}
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-semibold">{pr.name}</div>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="nums font-bold text-lime-hover">{shekel(pr.price)}</span>
                              <span className="nums text-xs text-muted line-through">{shekel(pr.originalPrice)}</span>
                            </div>
                          </div>
                          <span className="nums absolute left-3 top-3 rounded-full bg-lime/15 px-2 py-0.5 text-xs font-bold text-lime-hover">-{discountPct(pr)}%</span>
                        </Link>
                      </Reveal>
                  ))}
                  {restOffers.length === 0 && feature && <div className="flex items-center justify-center rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted sm:col-span-2">المزيد من العروض قريباً</div>}
                </div>
              </div>
            </section>
        )}

        {/* ============ CATEGORIES ============ */}
        {!!cats?.length && (
            <section className="bg-surface py-20">
              <div className="mx-auto max-w-6xl px-4">
                <Reveal className="mb-8">
                  <span className="text-sm font-semibold uppercase tracking-[0.2em] text-lime-hover">الفئات</span>
                  <h2 className="mt-2 text-3xl font-extrabold md:text-4xl">تصفّح الأصناف</h2>
                </Reveal>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {cats.map((c, i) => (
                      <Reveal key={c._id} delay={i * 80}>
                        <Link to={`/products?category=${c._id}`} className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-charcoal">
                          <img src={c.image} alt={c.name} className="h-full w-full object-cover opacity-90 transition duration-500 group-hover:scale-105" />
                          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/10 to-transparent" />
                          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-4">
                            <span className="font-bold text-white">{c.name}</span>
                            <span className="flex h-8 w-8 translate-x-2 items-center justify-center rounded-full bg-lime text-lime-fg opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100"><ArrowLeft size={16} /></span>
                          </div>
                        </Link>
                      </Reveal>
                  ))}
                </div>
              </div>
            </section>
        )}

        {/* ============ FEATURED PRODUCTS ============ */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <Reveal className="mb-8 flex items-end justify-between">
            <div>
              <span className="text-sm font-semibold uppercase tracking-[0.2em] text-lime-hover">الأحدث</span>
              <h2 className="mt-2 text-3xl font-extrabold md:text-4xl">أحدث المنتجات</h2>
            </div>
            <Link to="/products" className="text-sm font-medium text-lime-hover hover:underline">عرض الكل ←</Link>
          </Reveal>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {products?.map((pr, i) => (
                <Reveal key={pr.id} delay={(i % 4) * 80}>
                  <ProductCard p={pr} />
                </Reveal>
            ))}
          </div>
        </section>

        {/* ============ VALUE BAND ============ */}
        <section className="bg-charcoal text-charcoal-fg">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-3">
            {[
              { icon: Eye, title: 'فحص نظر متخصص', text: 'فحص دقيق على يد مختصين لاختيار العدسات المناسبة.' },
              { icon: ShieldCheck, title: 'منتجات أصلية', text: 'إطارات وعدسات أصلية بضمان معتمد.' },
              { icon: Truck, title: 'توصيل سريع', text: 'الضفة والقدس وأراضي ٤٨ — يُحتسب التوصيل حسب المنطقة.' },
            ].map((v, i) => (
                <Reveal key={v.title} delay={i * 100}>
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-lime/15 text-lime"><v.icon size={22} /></div>
                    <div>
                      <h3 className="font-bold">{v.title}</h3>
                      <p className="mt-1 text-sm text-white/65">{v.text}</p>
                    </div>
                  </div>
                </Reveal>
            ))}
          </div>
        </section>
      </div>
  );
}
