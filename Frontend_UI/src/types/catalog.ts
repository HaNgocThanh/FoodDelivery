export interface ProductItem {
  id: number;
  categoryId: number;
  categoryName?: string;
  name: string;
  description?: string;
  price: number;
  stockQuantity: number;
  origin?: string;
  isHot: boolean;
  isAvailable: boolean;
  imageUrl?: string | null;
  imagePublicId?: string | null;
}

export interface CategoryItem { id: number; name: string; description?: string; }
