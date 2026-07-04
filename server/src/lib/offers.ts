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

export async function loadActiveOffers(): Promise<ActiveOfferIndex> {
  const now = new Date();
  const offers = await Offer.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  }).lean();

  const byProduct = new Map<string, OfferLite[]>();
  const byCategory = new Map<string, OfferLite[]>();

  for (const o of offers) {
    const lite: OfferLite = {
      discountType: o.discountType,
      discountValue: o.discountValue,
      title: o.title,
    };

    if (o.type === 'all') {
      // applies to every product — stored under a special sentinel key
      push(byProduct, '__all__', lite);
    }

    if (o.type === 'categories' && o.categories) {
      for (const c of o.categories) push(byCategory, String(c), lite);
    }

    // keep backward compat with old 'category' (single) type if any old docs exist
    if (o.type === 'category' && o.category) {
      push(byCategory, String(o.category), lite);
    }

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
  const result =
      o.discountType === 'percentage'
          ? price * (1 - o.discountValue / 100)
          : price - o.discountValue;
  return Math.max(0, Math.round(result * 100) / 100);
}

export interface EffectivePrice {
  price: number;
  originalPrice: number;
  onOffer: boolean;
  offerTitle?: string;
}

export function resolvePrice(
    product: Pick<ProductDoc, 'price' | 'categories'> & { _id: any },
    idx: ActiveOfferIndex
): EffectivePrice {
  const productCategories: string[] = Array.isArray(product.categories)
      ? product.categories.map(String)
      : [];

  const applicable: OfferLite[] = [
    ...(idx.byProduct.get('__all__') || []),
    ...(idx.byProduct.get(String(product._id)) || []),
    ...productCategories.flatMap((catId) => idx.byCategory.get(catId) || []),
  ];

  if (applicable.length === 0) {
    return { price: product.price, originalPrice: product.price, onOffer: false };
  }

  // lowest price wins
  let best = product.price;
  let bestTitle: string | undefined;

  for (const o of applicable) {
    const candidate = applyOffer(product.price, o);
    if (candidate < best) {
      best = candidate;
      bestTitle = o.title;
    }
  }

  return {
    price: best,
    originalPrice: product.price,
    onOffer: best < product.price,
    offerTitle: bestTitle,
  };
}