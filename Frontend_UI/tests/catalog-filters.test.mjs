import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCatalogFilters, catalogRequest, sortCatalog } from '../src/utils/catalogFilters.ts';

test('Search filters round-trip through URL, including a zero upper price', () => {
  const filters = parseCatalogFilters(new URLSearchParams('keyword=C%C3%A0+chua&categoryId=1&minPrice=0&maxPrice=0&sort=price_desc'));
  assert.equal(filters.keyword, 'Cà chua');
  assert.equal(filters.categoryId, 1);
  const query = new URL('http://localhost' + catalogRequest(filters)).searchParams;
  assert.equal(query.get('maxPrice'), '0');
  assert.equal(query.get('minPrice'), '0');
  assert.equal(query.get('keyword'), 'Cà chua');
  assert.equal(query.has('sort'), false);
});

test('Malformed URL filters cannot become invalid API numbers; reversed prices are identified', () => {
  const filters = parseCatalogFilters(new URLSearchParams('categoryId=-2&minPrice=NaN&maxPrice=Infinity&sort=popular'));
  assert.equal(catalogRequest(filters), '/api/products');
  assert.equal(filters.sort, 'default');
  assert.equal(parseCatalogFilters(new URLSearchParams('minPrice=150000&maxPrice=50000')).invalidRange, true);
});

test('Sorting uses real prices and does not mutate the query cache array', () => {
  const products = Object.freeze([{ name: 'Bò', price: 250000 }, { name: 'Rau', price: 35000 }, { name: 'Cà chua', price: 100000 }]);
  assert.deepEqual(sortCatalog(products, 'price_asc').map(p => p.price), [35000, 100000, 250000]);
  assert.deepEqual(sortCatalog(products, 'price_desc').map(p => p.price), [250000, 100000, 35000]);
  assert.deepEqual(products.map(p => p.price), [250000, 35000, 100000]);
});
