export interface ProductColor {
  name: string;
  images: string[];
}

// Public product shape (cost-stripped, offer-adjusted)
export interface PublicProduct {
  id: string;
  name: string;
  code: string;
  category: string;
  size?: string;
  colors: ProductColor[];
  isSoldOut: boolean;
  price: number;
  originalPrice: number;
  onOffer: boolean;
  offerTitle?: string;
}

export interface Category {
  _id: string;
  name: string;
  description?: string;
  image: string;
}

export type DeliveryZone = 'westbank' | 'jerusalem' | 'inside48';

export interface CartItem {
  productId: string;
  name: string;
  code: string;
  image?: string;
  color?: string;
  price: number; // display only — server recomputes on checkout
  quantity: number;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

export interface Order {
  _id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  address?: string;
  items: {
    nameSnap: string;
    codeSnap: string;
    imageSnap?: string;
    color?: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }[];
  deliveryZone: DeliveryZone;
  deliveryFee: number;
  subtotal: number;
  total: number;
  status: 'pending' | 'confirmed' | 'out_for_delivery' | 'delivered' | 'cancelled';
  createdAt: string;
}
