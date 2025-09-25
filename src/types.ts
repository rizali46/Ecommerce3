export type ProductCategory =
  | 'Furniture & Lighting'
  | 'Audio & Horology'
  | 'Apothecary & Skincare'
  | 'Ceramics & Tableware';

export interface Product {
  id: string;
  sku: string;
  title: string;
  category: ProductCategory;
  subcategory: string;
  price: number;
  stock: number;
  soldCount: number;
  rating: number;
  reviewCount: number;
  material: string;
  dimensions: string;
  origin: string;
  description: string;
  imageUrl: string;
  badge: string;
  finishes: string[];
  isPublished: boolean;
  updatedAt?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedFinish: string;
}

export type OrderStatus =
  | 'processing'
  | 'packed'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type PaymentMethodType = 'card' | 'express_wallet' | 'cod';
export type PaymentStatusType = 'paid' | 'authorized' | 'cod_pending' | 'refunded';

export interface OrderItemRecord {
  id: string;
  orderId: string;
  userId: string;
  productId: string;
  title: string;
  category: string;
  finish: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  shippingDestination: string;
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  totalAmount: number;
  itemCount: number;
  paymentMethod: PaymentMethodType;
  paymentStatus: PaymentStatusType;
  paymentTransactionId: string;
  carrier: string;
  trackingNumber: string;
  status: OrderStatus;
  trackingNote: string;
  estimatedDelivery: string;
  createdAtMs: number;
  updatedAtMs: number;
  items?: OrderItemRecord[];
}

export interface ReviewRecord {
  id: string;
  productId: string;
  userId: string;
  authorName: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  helpfulCount: number;
  isPublished: boolean;
  createdAtMs: number;
}

export interface UserPublicProfile {
  uid: string;
  displayName: string;
  role: 'customer' | 'admin';
}

export interface UserPrivateProfile {
  uid: string;
  email: string;
  phone: string;
  streetAddress: string;
  city: string;
  postalCode: string;
  country: string;
  defaultPaymentBrand: string;
  defaultPaymentLast4: string;
}
