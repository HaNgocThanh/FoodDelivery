// =============================================
// API Error type (maps to ASP.NET ProblemDetails)
// =============================================
export interface ApiError {
  status: number;
  title: string;
  detail: string;
  errors?: Record<string, string[]>; // FluentValidation errors
}

// =============================================
// Product
// =============================================
export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
  stockQuantity: number;
  imageUrl: string;
  categoryId: number;
  categoryName: string;
  rating: number;
  reviewCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface ProductFilters {
  keyword?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'popular';
  page: number;
  pageSize: number;
}

export interface CreateProductDTO {
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  stockQuantity: number;
  categoryId: number;
  imageUrl: string;
}

// =============================================
// Category
// =============================================
export interface Category {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
}

// =============================================
// Cart
// =============================================
export interface CartItem {
  productId: number;
  name: string;
  imageUrl: string;
  price: number;
  quantity: number;
  stockQuantity: number;
  isAvailable: boolean;
}

// =============================================
// Order
// =============================================
export type OrderStatus =
  | 'Pending'
  | 'Processing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'
  | 'Refunded';

export type PaymentMethod = 'COD' | 'BankTransfer' | 'Momo' | 'VnPay';

export type PaymentStatus = 'Pending' | 'Paid' | 'Failed' | 'Refunded';

export interface OrderItem {
  productId: number;
  productName: string;
  imageUrl: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Order {
  id: number;
  userId: string;
  status: OrderStatus;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  shippingAddress: string;
  couponCode?: string;
  notes?: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface CreateOrderDTO {
  items: { productId: number; quantity: number }[];
  paymentMethod: PaymentMethod;
  shippingAddress: string;
  couponCode?: string;
  notes?: string;
}

// =============================================
// Auth
// =============================================
export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: 'Customer' | 'Admin';
  avatarUrl?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterDTO {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface AuthResponseDTO {
  token: string;
  expiresAt: string;
  user: User;
}

// =============================================
// Pagination
// =============================================
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
