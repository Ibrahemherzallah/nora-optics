import { Offer } from '../models/Offer';
import { ProductDoc } from '../models/Product';

export interface ActiveOfferIndex {
  byProduct: Map<string, OfferLite[]>;
  byCategory: Map<string, OfferLite[]>;
}
interface OfferLite {
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  title: string;
}

// Build once per request (review #9) — avoids N+1 inside product maps.
export async function loadActiveOffers(): Promise<ActiveOfferIndex> {
  const now = new Date();
  const offers = await Offer.find({ isActive: true, startDate: { $lte: now }, endDate: { $gte: now } }).lean();
  const byProduct = new Map<string, OfferLite[]>();
  const byCategory = new Map<string, OfferLite[]>();
  for (const o of offers) {
    const lite: OfferLite = { discountType: o.discountType, discountValue: o.discountValue, title: o.title };
    if (o.type === 'category' && o.category) push(byCategory, String(o.category), lite);
    if ((o.type === 'products' || o.type === 'product') && o.products) {
      for (const p of o.products) push(byProduct, String(p), lite);
    }
  }
  return { byProduct, byCategory };
}

function push(map: Map<string, OfferLite[]>, key: string, val: OfferLite) {
  const arr = map.get(key) || [];
  arr.push(val);
  map.set(key, arr);
}

function applyOffer(price: number, o: OfferLite): number {
  const result = o.discountType === 'percentage' ? price * (1 - o.discountValue / 100) : price - o.discountValue;
  return Math.max(0, Math.round(result * 100) / 100);
}

export interface EffectivePrice {
  price: number; // best (lowest) effective price
  originalPrice: number;
  onOffer: boolean;
  offerTitle?: string;
}

// Authoritative pricing (review rule 6). Lowest resulting price wins.
export function resolvePrice(product: Pick<ProductDoc, 'price' | 'category'> & { _id: any }, idx: ActiveOfferIndex): EffectivePrice {
  const applicable: OfferLite[] = [
    ...(idx.byProduct.get(String(product._id)) || []),
    ...(idx.byCategory.get(String(product.category)) || []),
  ];
  if (applicable.length === 0) return { price: product.price, originalPrice: product.price, onOffer: false };

  let best = product.price;
  let bestTitle: string | undefined;
  for (const o of applicable) {
    const candidate = applyOffer(product.price, o);
    if (candidate < best) {
      best = candidate;
      bestTitle = o.title;
    }
  }
  return { price: best, originalPrice: product.price, onOffer: best < product.price, offerTitle: bestTitle };
}
