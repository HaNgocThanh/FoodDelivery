import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, RefreshCw, SlidersHorizontal, X } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import type { CategoryItem, ProductItem } from '../../types/catalog';
import { catalogRequest, parseCatalogFilters, sortCatalog } from '../../utils/catalogFilters';
import { ProductSkeletons } from './ProductCard';
import { useCatalogCart } from './useCatalogCart';

interface PriceFormProps {
  minPrice?: number;
  maxPrice?: number;
  apply: (min: string, max: string) => void;
}

function PriceForm({ minPrice, maxPrice, apply }: PriceFormProps) {
  const fieldId = useId();
  const [min, setMin] = useState(minPrice?.toString() ?? '');
  const [max, setMax] = useState(maxPrice?.toString() ?? '');
  const [error, setError] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const invalid = [min, max].some((value) => value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > Number.MAX_SAFE_INTEGER));
    if (invalid || (min !== '' && max !== '' && Number(min) > Number(max))) {
      setError('Giá đến phải lớn hơn hoặc bằng giá từ.');
      return;
    }
    setError('');
    apply(min, max);
  }
  return <form className="catalog-price-form" onSubmit={submit}>
    <h3>Khoảng giá</h3>
    <div className="catalog-price-fields">
      <label htmlFor={`${fieldId}-min`}>Từ (₫)<input id={`${fieldId}-min`} type="number" inputMode="numeric" min="0" max={Number.MAX_SAFE_INTEGER} step="any" placeholder="Không giới hạn" value={min} onChange={(e) => setMin(e.target.value)} aria-invalid={!!error} aria-describedby={error ? `${fieldId}-error` : undefined} /></label>
      <label htmlFor={`${fieldId}-max`}>Đến (₫)<input id={`${fieldId}-max`} type="number" inputMode="numeric" min="0" max={Number.MAX_SAFE_INTEGER} step="any" placeholder="Không giới hạn" value={max} onChange={(e) => setMax(e.target.value)} aria-invalid={!!error} aria-describedby={error ? `${fieldId}-error` : undefined} /></label>
    </div>
    {error && <p id={`${fieldId}-error`} className="catalog-field-error" role="alert">{error}</p>}
    <button className="catalog-apply" type="submit">Áp dụng giá <ArrowRight size={16} /></button>
  </form>;
}

function CatalogResults({ products, renderProduct }: { products: ProductItem[]; renderProduct: (product: ProductItem) => ReactNode }) {
  const [limit, setLimit] = useState(12);
  return <><div className="shop-grid">{products.slice(0, limit).map((product) => renderProduct(product))}</div>
    {products.length > limit && <div className="catalog-more"><button className="catalog-outline" onClick={() => setLimit((value) => value + 12)}>Xem thêm sản phẩm</button></div>}</>;
}

export function CatalogPage({ mode }: { mode: 'products' | 'search' }) {
  const [params, setParams] = useSearchParams();
  const filters = parseCatalogFilters(params);
  const { keyword, categoryId, minPrice, maxPrice, sort, invalidRange } = filters;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterId = useId();
  const { renderProduct, announcement } = useCatalogCart();
  const categories = useQuery<CategoryItem[]>({
    queryKey: ['categories'],
    queryFn: ({ signal }) => axiosClient.get<CategoryItem[], CategoryItem[]>('/api/categories', { signal }),
    retry: 1,
  });
  const request = catalogRequest(filters);
  const catalog = useQuery<ProductItem[]>({
    queryKey: request === '/api/products' ? ['products', null] : ['product-search', keyword, categoryId, minPrice, maxPrice],
    queryFn: ({ signal }) => axiosClient.get<ProductItem[], ProductItem[]>(request, { signal }),
    enabled: !invalidRange,
    retry: 1,
  });
  const products = sortCatalog(catalog.data ?? [], sort);
  const activeCount = Number(categoryId !== null) + Number(minPrice !== undefined || maxPrice !== undefined);
  const categoryName = categories.data?.find((category) => category.id === categoryId)?.name ?? (categoryId === null ? '' : `Danh mục #${categoryId}`);
  const resultsKey = [keyword, categoryId, minPrice, maxPrice, sort].join('|');
  const update = (patch: Record<string, string | null>) => {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === '') next.delete(key); else next.set(key, value);
      }
      return next;
    });
  };
  const clearFilters = () => update({ categoryId: null, minPrice: null, maxPrice: null });
  return <div className="catalog-page" data-testid={mode === 'products' ? 'product-list-page' : 'search-page'}>
    <header className="catalog-page-heading"><h1>{keyword ? <>Kết quả cho “{keyword}”</> : mode === 'search' ? 'Tìm sản phẩm' : 'Sản phẩm'}</h1>
      {keyword && <button className="catalog-text-button" onClick={() => update({ keyword: null })}>Xóa từ khóa <X size={15} /></button>}
    </header>
    <div className="catalog-layout">
      <aside className="catalog-filters" aria-label="Bộ lọc sản phẩm">
        <h2 className="catalog-filter-heading">Bộ lọc</h2>
        <button className="catalog-filter-toggle" aria-expanded={filtersOpen} aria-controls={filterId} onClick={() => setFiltersOpen((open) => !open)}><SlidersHorizontal size={18} />Bộ lọc{activeCount > 0 ? ` (${activeCount})` : ''}<span>{filtersOpen ? 'Đóng' : 'Mở'}</span></button>
        <div id={filterId} className={`catalog-filter-body${filtersOpen ? ' is-open' : ''}`}>
          <section className="catalog-categories" aria-labelledby={`${filterId}-categories`}><h3 id={`${filterId}-categories`}>Danh mục</h3>
            <button data-testid="category-filter-all" aria-pressed={categoryId === null} className={categoryId === null ? 'is-selected' : ''} onClick={() => update({ categoryId: null })}>Tất cả</button>
            {categories.data?.map((category) => <button key={category.id} data-testid={`category-filter-${category.id}`} aria-pressed={categoryId === category.id} className={categoryId === category.id ? 'is-selected' : ''} onClick={() => update({ categoryId: String(category.id) })}>{category.name}</button>)}
            {categories.isPending && <p role="status">Đang tải danh mục…</p>}
            {categories.isError && <button className="catalog-text-button" onClick={() => void categories.refetch()}><RefreshCw size={14} />Tải lại danh mục</button>}
          </section>
          <PriceForm key={`${minPrice}-${maxPrice}`} minPrice={minPrice} maxPrice={maxPrice} apply={(min, max) => { update({ minPrice: min, maxPrice: max }); setFiltersOpen(false); }} />
          {activeCount > 0 && <button className="catalog-reset" onClick={clearFilters}>Xóa bộ lọc</button>}
        </div>
      </aside>
      <section className="catalog-results" aria-label="Kết quả sản phẩm" aria-busy={catalog.isFetching}>
        <div className="catalog-toolbar"><p role="status">{invalidRange ? 'Kiểm tra khoảng giá' : catalog.isPending ? 'Đang tải sản phẩm…' : catalog.isError ? 'Chưa tải được kết quả' : `${products.length} sản phẩm`}{catalog.isFetching && !catalog.isPending ? ' · Đang cập nhật…' : ''}</p>
          <label className="catalog-sort">Sắp xếp<select aria-label="Sắp xếp sản phẩm" value={sort} onChange={(e) => update({ sort: e.target.value === 'default' ? null : e.target.value })}><option value="default">Mặc định</option><option value="price_asc">Giá tăng dần</option><option value="price_desc">Giá giảm dần</option><option value="name">Tên A–Z</option></select></label>
        </div>
        {activeCount > 0 && <div className="catalog-active" aria-label="Bộ lọc đang áp dụng">
          {categoryId !== null && <button onClick={() => update({ categoryId: null })} aria-label={`Bỏ lọc ${categoryName}`}>{categoryName}<X size={14} /></button>}
          {(minPrice !== undefined || maxPrice !== undefined) && <button onClick={() => update({ minPrice: null, maxPrice: null })} aria-label="Bỏ lọc giá">{minPrice !== undefined ? minPrice.toLocaleString('vi-VN') : '0'} – {maxPrice !== undefined ? `${maxPrice.toLocaleString('vi-VN')} ₫` : 'không giới hạn'}<X size={14} /></button>}
        </div>}
        {invalidRange ? <div className="shop-state" role="alert"><h2>Khoảng giá chưa hợp lệ</h2><p>Giá đến phải lớn hơn hoặc bằng giá từ.</p><button onClick={() => { update({ minPrice: null, maxPrice: null }); setFiltersOpen(true); }}>Đặt lại khoảng giá</button></div>
          : catalog.isError ? <div className="shop-state" role="alert"><h2>Chưa tải được sản phẩm</h2><p>Vui lòng thử lại để xem giá và tồn kho.</p><button onClick={() => void catalog.refetch()} disabled={catalog.isFetching}><RefreshCw size={16} />{catalog.isFetching ? 'Đang tải…' : 'Thử lại'}</button></div>
            : catalog.isPending ? <div className="shop-grid" aria-label="Đang tải sản phẩm"><ProductSkeletons count={8} /></div>
              : products.length === 0 ? <div className="shop-state"><h2>Không có sản phẩm phù hợp</h2><p>{keyword || activeCount ? 'Thử đổi từ khóa hoặc xóa bộ lọc.' : 'Bạn ghé lại sau nhé.'}</p>{activeCount > 0 ? <button onClick={clearFilters}>Xóa bộ lọc</button> : keyword ? <button onClick={() => update({ keyword: null })}>Xem tất cả sản phẩm</button> : null}</div>
                : <CatalogResults key={resultsKey} products={products} renderProduct={renderProduct} />}
      </section>
    </div>
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
  </div>;
}
