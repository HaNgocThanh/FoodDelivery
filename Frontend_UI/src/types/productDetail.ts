import type { ProductItem } from './catalog';

export interface ReviewItem {
  id: number;
  userId: number;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ProductDetailItem extends ProductItem {
  averageRating: number;
  reviews?: ReviewItem[] | null;
}

export interface ProductQuestion {
  id: number;
  productId: number;
  userFullName: string;
  questionText: string;
  answerText?: string | null;
  createdAt: string;
  answeredAt?: string | null;
}

export interface PurchaseHistoryItem {
  status: string | number;
  details?: { productId: number }[];
}
