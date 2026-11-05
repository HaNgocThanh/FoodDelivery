import type {ProductItem,CategoryItem} from '../types/catalog';
export interface ProductDraft {name:string;description:string;price:string;origin:string;categoryId:string;stockQuantity:string;isHot:boolean;isAvailable:boolean;}
export type ProductErrors=Partial<Record<keyof ProductDraft,string>>;
export function productDraft(product?:ProductItem):ProductDraft{return {name:product?.name??'',description:product?.description??'',price:product?String(product.price):'',origin:product?.origin??'',categoryId:product?String(product.categoryId):'',stockQuantity:product?String(product.stockQuantity):'0',isHot:product?.isHot??false,isAvailable:product?.isAvailable??true};}
export function validateProduct(draft:ProductDraft,create:boolean,categories:CategoryItem[]):ProductErrors{
 const errors:ProductErrors={};if(!draft.name.trim())errors.name='Nhập tên sản phẩm.';
 if(!draft.price.trim()||!Number.isFinite(Number(draft.price))||Number(draft.price)<=0||Number(draft.price)>Number.MAX_SAFE_INTEGER)errors.price='Nhập giá lớn hơn 0.';
 if(create){if(!categories.some(category=>String(category.id)===draft.categoryId))errors.categoryId='Chọn danh mục có trong danh sách.';if(!draft.stockQuantity.trim()||!Number.isInteger(Number(draft.stockQuantity))||Number(draft.stockQuantity)<0||Number(draft.stockQuantity)>2147483647)errors.stockQuantity='Nhập số nguyên từ 0 đến 2.147.483.647.';}return errors;
}
export function validRestock(quantity:string,stock:number){return !!quantity.trim()&&Number.isInteger(Number(quantity))&&Number(quantity)>0&&Number(quantity)<=2147483647-stock;}
export function imageFileError(file:{type:string;size:number}){return !['image/png','image/jpeg','image/jpg','image/webp'].includes(file.type)?'Chọn ảnh PNG, JPG hoặc WEBP.':file.size<=0?'Ảnh đang trống. Hãy chọn lại.':file.size>10*1024*1024?'Ảnh tối đa 10 MB.':'';}
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
export function readAdminProducts(data:unknown):ProductItem[]{
 if(!Array.isArray(data)||data.some(row=>!record(row)||!Number.isInteger(row.id)||Number(row.id)<=0||typeof row.name!=='string'||typeof row.price!=='number'||!Number.isFinite(row.price)||row.price<0||!Number.isInteger(row.stockQuantity)||Number(row.stockQuantity)<0||typeof row.isHot!=='boolean'||typeof row.isAvailable!=='boolean'||!Number.isInteger(row.categoryId)||!['description','categoryName','origin','imageUrl','imagePublicId'].every(key=>row[key]==null||typeof row[key]==='string')))throw Error('Dữ liệu sản phẩm không hợp lệ. Vui lòng tải lại.');return data as ProductItem[];
}
export function readAdminCategories(data:unknown):CategoryItem[]{if(!Array.isArray(data)||data.some(row=>!record(row)||!Number.isInteger(row.id)||Number(row.id)<=0||typeof row.name!=='string'||!row.name.trim()))throw Error('Dữ liệu danh mục không hợp lệ. Vui lòng tải lại.');return data as CategoryItem[];}
export function productSaleStatus(product:Pick<ProductItem,'stockQuantity'|'isAvailable'>){return product.stockQuantity===0?'empty':product.isAvailable?'available':'paused';}
export function filterAdminProducts(products:ProductItem[],keyword:string,category:string,stock:string){const term=keyword.trim().toLocaleLowerCase('vi');return products.filter(product=>(!term||`${product.id} ${product.name}`.toLocaleLowerCase('vi').includes(term))&&(!category||String(product.categoryId)===category)&&(!stock||productSaleStatus(product)===stock));}
