import { ProductDoc } from '../models/Product';
import { ActiveOfferIndex, resolvePrice } from './offers';

// Public-facing shape. cost / isInOffer internals NEVER leave the server (PRD §4.2 security).
export function serializeProductPublic(p: any, idx: ActiveOfferIndex) {
  const eff = resolvePrice(p, idx);
  return {
    id: String(p._id),
    name: p.name,
    code: p.code,
    category: p.category,
    size: p.size,
    colors: p.colors,
    isSoldOut: p.isSoldOut,
    price: eff.price,
    originalPrice: eff.originalPrice,
    onOffer: eff.onOffer,
    offerTitle: eff.offerTitle,
  };
}
