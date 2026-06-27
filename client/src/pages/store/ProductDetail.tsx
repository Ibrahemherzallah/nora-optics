import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Minus, Plus, ShoppingCart, Barcode } from 'lucide-react';
import { api } from '../../lib/api';
import { PublicProduct, Category } from '../../lib/types';
import { shekel } from '../../lib/format';
import { useCart } from '../../store/cart';

interface Contact {
    whatsapp?: string;
    phones?: string[];
}

function WhatsAppIcon({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
    );
}

// Normalize a local PS number (05XXXXXXXX) to international (9705XXXXXXXX) for wa.me.
function toWaNumber(raw?: string): string | null {
    if (!raw) return null;
    let n = raw.replace(/\D/g, '');
    if (!n) return null;
    if (n.startsWith('00')) n = n.slice(2);
    else if (n.startsWith('0')) n = '970' + n.slice(1);
    return n;
}

export function ProductDetail() {
    const { id } = useParams();
    const add = useCart((s) => s.add);
    const [colorIdx, setColorIdx] = useState(0);
    const [imgIdx, setImgIdx] = useState(0);
    const [qty, setQty] = useState(1);
    const contactWhatsapp = '+970595896992';
    const { data: p, isLoading, isError, error } = useQuery({
        queryKey: ['product', id],
        queryFn: async () => (await api.get<PublicProduct>(`/products/${id}`)).data,
    });
    const { data: cats } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => (await api.get<{ data: Category[] }>('/categories')).data.data,
    });

    if (isLoading) return <div className="mx-auto max-w-6xl px-4 py-16 text-center text-muted">جارٍ التحميل…</div>;
    if (isError) return <div className="mx-auto max-w-6xl px-4 py-16 text-center text-destructive">{(error as Error).message}</div>;
    if (!p) return null;

    const multiColor = p.colors.length > 1;
    const color = p.colors[colorIdx];
    const images = color?.images || [];
    const categoryName = cats?.find((c) => c._id === p.category)?.name;

    const waNumber = toWaNumber(contactWhatsapp || '+970595896992');
    const waMessage = `مرحباً، أرغب بالاستفسار عن المنتج: ${p.name} (كود: ${p.code})`;
    const waLink = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}` : null;

    return (
        <div className="mx-auto max-w-6xl px-4 py-6">
            {/* Back link */}
            <Link to="/products" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-charcoal">
                <ArrowLeft size={16} /> العودة للمنتجات
            </Link>

            <div className="grid gap-10 md:grid-cols-2">
                {/* ---------- GALLERY (right in RTL) ---------- */}
                <div>
                    <div className="relative aspect-square overflow-hidden rounded-3xl bg-surface">
                        {images[imgIdx] ? (
                            <img src={images[imgIdx]} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full items-center justify-center text-muted">لا توجد صورة</div>
                        )}
                        {p.onOffer && (
                            <span className="absolute right-4 top-4 rounded-full bg-lime px-3 py-1 text-xs font-bold text-lime-fg">عرض خاص</span>
                        )}
                        {p.isSoldOut && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                                <span className="rounded-full bg-charcoal px-5 py-2 font-bold text-white">نفذت الكمية</span>
                            </div>
                        )}
                    </div>

                    {/* Thumbnails under main image (multi-image of the current color) */}
                    {images.length > 1 && (
                        <div className="mt-4 flex gap-3">
                            {images.map((img, i) => (
                                <button
                                    key={i}
                                    onClick={() => setImgIdx(i)}
                                    className={`h-20 w-20 overflow-hidden rounded-2xl border-2 transition ${i === imgIdx ? 'border-lime' : 'border-line hover:border-muted'}`}
                                >
                                    <img src={img} alt="" className="h-full w-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* ---------- INFO (left in RTL) ---------- */}
                <div>
                    <h1 className="text-3xl font-extrabold md:text-4xl">{p.name}</h1>

                    {/* Code + availability pills */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="nums inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1 text-xs text-muted">
                          <Barcode size={14} /> {p.code}
                        </span>
                        {p.isSoldOut ? (
                            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-destructive">نفذت الكمية</span>
                        ) : (
                            <span className="rounded-full bg-lime/20 px-3 py-1 text-xs font-semibold text-lime-hover">متوفر</span>
                        )}
                    </div>

                    {/* Color circles (more than one color) */}
                    {multiColor && (
                        <div className="mt-6">
                            <p className="mb-2 text-sm text-muted">الألوان المتوفرة</p>
                            <div className="flex flex-wrap gap-3">
                                {p.colors.map((c, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            setColorIdx(i);
                                            setImgIdx(0);
                                        }}
                                        title={c.name}
                                        className={`relative h-12 w-12 overflow-hidden rounded-full border-2 transition ${
                                            i === colorIdx ? 'border-lime ring-2 ring-lime/40' : 'border-line hover:border-muted'
                                        }`}
                                    >
                                        {c.images[0] ? (
                                            <img src={c.images[0]} alt={c.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <span className="flex h-full w-full items-center justify-center bg-surface text-[10px] text-muted">{c.name}</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                            {color?.name && <p className="mt-2 text-sm font-medium">{color.name}</p>}
                        </div>
                    )}

                    {/* Price card */}
                    <div className="mt-6 flex items-center justify-between rounded-2xl bg-surface px-5 py-4">
                        <span className="text-sm text-muted">السعر</span>
                        <div className="flex items-center gap-3">
                            {p.onOffer && <span className="nums text-base text-muted line-through">{shekel(p.originalPrice)}</span>}
                            <span className="nums text-2xl font-extrabold text-lime-hover">{shekel(p.price)}</span>
                        </div>
                    </div>

                    {/* Info card */}
                    <div className="mt-4 grid grid-cols-2 gap-y-4 rounded-2xl border border-line bg-white p-5 text-sm">
                        <InfoCell label="التصنيف" value={categoryName || '—'} />
                        <InfoCell label="المعرّف الداخلي" value={<span className="nums">{p.code}</span>} />
                        {p.size && <InfoCell label="المقاس" value={p.size} />}
                        <InfoCell label="حالة المنتج" value={p.isSoldOut ? 'نفذت الكمية' : 'متوفر'} />
                    </div>

                    {/* Actions: quantity + add to cart + whatsapp */}
                    <div className="mt-6 flex items-stretch gap-3">
                        <div className="flex items-center rounded-2xl border border-line">
                            <button
                                onClick={() => setQty((q) => Math.max(1, q - 1))}
                                disabled={p.isSoldOut}
                                className="px-3 py-3 text-charcoal disabled:opacity-40"
                                aria-label="إنقاص"
                            >
                                <Minus size={16} />
                            </button>
                            <span className="nums w-8 text-center font-semibold">{qty}</span>
                            <button
                                onClick={() => setQty((q) => q + 1)}
                                disabled={p.isSoldOut}
                                className="px-3 py-3 text-charcoal disabled:opacity-40"
                                aria-label="زيادة"
                            >
                                <Plus size={16} />
                            </button>
                        </div>

                        <button
                            disabled={p.isSoldOut}
                            onClick={() =>
                                add({
                                    productId: p.id,
                                    name: p.name,
                                    code: p.code,
                                    image: images[0],
                                    color: color?.name,
                                    price: p.price,
                                    quantity: qty,
                                })
                            }
                            className="btn-primary flex-1"
                        >
                            <ShoppingCart size={18} /> {p.isSoldOut ? 'غير متوفر' : 'أضف إلى السلة'}
                        </button>

                        {waLink && (
                            <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 font-semibold text-white transition hover:bg-[#1faa54]"
                                aria-label="استفسر عبر واتساب"
                            >
                                <WhatsAppIcon size={22} />
                            </a>
                        )}
                    </div>
                    {waLink && <p className="mt-2 text-xs text-muted">للاستفسار السريع عن هذا المنتج تواصل معنا عبر واتساب.</p>}
                </div>
            </div>
        </div>
    );
}

function InfoCell({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <div className="text-muted">{label}</div>
            <div className="mt-0.5 font-semibold">{value}</div>
        </div>
    );
}
