export type CatalogSort = 'default' | 'price_asc' | 'price_desc' | 'name';

export function parseCatalogFilters(params: URLSearchParams) {
  const parsePrice = (value: string | null) => {
    if (value === null || !value.trim()) return undefined;
    const price = Number(value);
    return Number.isFinite(price) && price >= 0 && price <= Number.MAX_SAFE_INTEGER ? price : undefined;
  };
  const category = Number(params.get('categoryId'));
  const categoryId = Number.isSafeInteger(category) && category > 0 ? category : null;
  const minPrice = parsePrice(params.get('minPrice'));
  const maxPrice = parsePrice(params.get('maxPrice'));
  const sortParam = params.get('sort');
  const sort: CatalogSort = sortParam === 'price_asc' || sortParam === 'price_desc' || sortParam === 'name' ? sortParam : 'default';
  return { keyword: params.get('keyword')?.trim() ?? '', categoryId, minPrice, maxPrice, sort,
    invalidRange: minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice };
}

export function catalogRequest(filters: ReturnType<typeof parseCatalogFilters>) {
  const params = new URLSearchParams();
  if (filters.keyword) params.set('keyword', filters.keyword);
  if (filters.categoryId !== null) params.set('categoryId', String(filters.categoryId));
  if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
  return params.size ? `/api/products/search?${params}` : '/api/products';
}

export function sortCatalog<T extends { price: number; name: string }>(products: readonly T[], sort: CatalogSort): T[] {
  if (sort === 'price_asc') return products.toSorted((a, b) => a.price - b.price);
  if (sort === 'price_desc') return products.toSorted((a, b) => b.price - a.price);
  if (sort === 'name') return products.toSorted((a, b) => a.name.localeCompare(b.name, 'vi'));
  return [...products];
}
