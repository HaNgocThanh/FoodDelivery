import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../api/axiosClient';
import AdminLayout from '@/components/AdminLayout';
import ImageUploader from '@/components/admin/ImageUploader';
import {
  Boxes,
  Plus,
  Edit,
  PackagePlus,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle,
  Flame
} from 'lucide-react';

interface ImageUploadResponse {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

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

export default function ProductManagementPage() {
  const queryClient = useQueryClient();

  // Modals state
  const [restockProduct, setRestockProduct] = useState<ProductItem | null>(null);
  const [additionalQty, setAdditionalQty] = useState<number>(50);

  const [editProduct, setEditProduct] = useState<ProductItem | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    price: 0,
    origin: '',
    isHot: false,
    isAvailable: true,
    imageUrl: '',
    imagePublicId: '',
  });
  // File user đã chọn nhưng CHƯA upload — chỉ upload khi bấm "Lưu thay đổi".
  const [editPendingFile, setEditPendingFile] = useState<File | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState({
    categoryId: 1,
    name: '',
    description: '',
    price: 100000,
    stockQuantity: 10,
    origin: 'Việt Nam',
    isHot: false,
    imageUrl: '',
    imagePublicId: '',
  });
  const [createPendingFile, setCreatePendingFile] = useState<File | null>(null);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // ─── Helper: upload 1 file ảnh lên Cloudinary ──────────────────────────
  // Trả về { url, publicId } hoặc throw Error nếu thất bại.
  // Parent gọi hàm này trong submit handler SAU KHI user bấm "Lưu/Tạo".
  const uploadImage = async (file: File): Promise<{ url: string; publicId: string }> => {
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axiosClient.post<ImageUploadResponse, ImageUploadResponse>(
        '/api/upload/image',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      if (!response?.url || !response?.publicId) {
        throw new Error('Phản hồi từ server không hợp lệ.');
      }
      return { url: response.url, publicId: response.publicId };
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Query tất cả sản phẩm
  const { data: products = [], isLoading, isError, refetch } = useQuery<ProductItem[]>({
    queryKey: ['admin-products'],
    queryFn: async () => {
      return await axiosClient.get<ProductItem[], ProductItem[]>('/api/products');
    },
  });

  // Mutation Nhập kho (PATCH /api/products/{id}/restock)
  const restockMutation = useMutation<ProductItem, Error, { id: number; quantity: number }>({
    mutationFn: async ({ id, quantity }) => {
      return await axiosClient.patch<ProductItem, ProductItem>(`/api/products/${id}/restock`, { quantity });
    },
    onSuccess: (updatedProduct) => {
      setNotification({
        type: 'success',
        message: `Đã nhập thêm +${additionalQty} sản phẩm vào kho cho '${updatedProduct.name}'. Tồn kho hiện tại: ${updatedProduct.stockQuantity}!`,
      });
      setRestockProduct(null);
      // Invalidate queries để tự động làm mới lưới dữ liệu lập tức
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: (err: Error) => {
      setNotification({ type: 'error', message: err.message || 'Không thể nhập kho sản phẩm.' });
    },
  });

  // Mutation Chỉnh sửa (PUT /api/products/{id})
  // Flow: nếu có editPendingFile → upload lên Cloudinary trước → lấy URL mới →
  //       PUT product với URL mới. Backend service sẽ xoá ảnh cũ trên Cloudinary.
  const editMutation = useMutation<ProductItem, Error, void>({
    mutationFn: async () => {
      if (!editProduct) throw new Error('Không có sản phẩm đang chỉnh sửa.');
      let imageUrl = editForm.imageUrl;
      let imagePublicId = editForm.imagePublicId;
      if (editPendingFile) {
        const uploaded = await uploadImage(editPendingFile);
        imageUrl = uploaded.url;
        imagePublicId = uploaded.publicId;
      }
      return await axiosClient.put<ProductItem, ProductItem>(`/api/products/${editProduct.id}`, {
        ...editForm,
        imageUrl,
        imagePublicId,
      });
    },
    onSuccess: (updatedProduct) => {
      setNotification({
        type: 'success',
        message: `Cập nhật thành công thông tin sản phẩm '${updatedProduct.name}'!`,
      });
      setEditProduct(null);
      setEditPendingFile(null);
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: (err: Error) => {
      setNotification({ type: 'error', message: err.message || 'Không thể cập nhật sản phẩm.' });
    },
  });

  // Mutation Thêm mới (POST /api/products)
  // Flow: nếu có createPendingFile → upload trước → lấy URL → POST product.
  const createMutation = useMutation<ProductItem, Error, void>({
    mutationFn: async () => {
      let imageUrl: string | null = createForm.imageUrl || null;
      let imagePublicId: string | null = createForm.imagePublicId || null;
      if (createPendingFile) {
        const uploaded = await uploadImage(createPendingFile);
        imageUrl = uploaded.url;
        imagePublicId = uploaded.publicId;
      }
      return await axiosClient.post<ProductItem, ProductItem>('/api/products', {
        ...createForm,
        imageUrl,
        imagePublicId,
      });
    },
    onSuccess: (newProduct) => {
      setNotification({
        type: 'success',
        message: `Thêm mới sản phẩm '${newProduct.name}' thành công!`,
      });
      setIsCreateOpen(false);
      // Reset form để lần mở sau sạch sẽ (đặc biệt là các field ảnh)
      setCreateForm({
        categoryId: 1,
        name: '',
        description: '',
        price: 100000,
        stockQuantity: 10,
        origin: 'Việt Nam',
        isHot: false,
        imageUrl: '',
        imagePublicId: '',
      });
      setCreatePendingFile(null);
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: (err: Error) => {
      setNotification({ type: 'error', message: err.message || 'Không thể tạo sản phẩm mới.' });
    },
  });

  const handleOpenEdit = (p: ProductItem) => {
    setEditProduct(p);
    setEditForm({
      name: p.name,
      description: p.description || '',
      price: p.price,
      origin: p.origin || '',
      isHot: p.isHot,
      isAvailable: p.isAvailable,
      imageUrl: p.imageUrl || '',
      imagePublicId: p.imagePublicId || '',
    });
    setEditPendingFile(null);
  };

  const handleCloseEdit = () => {
    setEditProduct(null);
    setEditPendingFile(null);
    setEditForm((prev) => ({ ...prev, imageUrl: '', imagePublicId: '' }));
  };

  const handleCloseCreate = () => {
    setIsCreateOpen(false);
    setCreatePendingFile(null);
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 space-y-6 min-h-screen">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
              <Boxes className="w-8 h-8 text-orange-500" />
              Quản lý Sản phẩm & Nhập kho
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Theo dõi tồn kho thực tế, nhập kho bổ sung và cập nhật danh mục hàng hóa
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Làm mới
            </button>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl shadow-lg shadow-orange-500/20 transition text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              Thêm sản phẩm mới
            </button>
          </div>
        </div>

        {/* NOTIFICATION TOAST */}
        {notification && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
              notification.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                : 'bg-red-950/80 border-red-500/50 text-red-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {notification.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400" />
              )}
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* TABLE CONTAINER */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
              <span>Đang tải danh sách sản phẩm...</span>
            </div>
          ) : isError ? (
            <div className="p-12 text-center text-red-400 flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8" />
              <span>Không thể tải dữ liệu sản phẩm từ server.</span>
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
              <Boxes className="w-10 h-10 text-slate-600 mb-2" />
              <p className="font-semibold text-slate-300">Chưa có sản phẩm nào trong kho</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800/80 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-700/60">
                    <th className="py-4 px-6">ID</th>
                    <th className="py-4 px-6">Tên sản phẩm</th>
                    <th className="py-4 px-6">Giá niêm yết</th>
                    <th className="py-4 px-6">Số lượng tồn kho</th>
                    <th className="py-4 px-6">Trạng thái bán</th>
                    <th className="py-4 px-6 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-4 px-6 font-mono font-bold text-orange-400">#{product.id}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-100">{product.name}</span>
                          {product.isHot && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              <Flame className="w-3 h-3 fill-amber-400" /> HOT
                            </span>
                          )}
                        </div>
                        {product.origin && (
                          <span className="text-xs text-slate-400 block mt-0.5">Xuất xứ: {product.origin}</span>
                        )}
                      </td>
                      <td className="py-4 px-6 font-bold text-orange-400">
                        {product.price?.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold border ${
                            product.stockQuantity === 0
                              ? 'bg-red-500/20 text-red-400 border-red-500/40'
                              : product.stockQuantity <= 10
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse'
                              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          }`}
                        >
                          {product.stockQuantity} sản phẩm
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {product.isAvailable && product.stockQuantity > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle className="w-3.5 h-3.5" /> Sẵn sàng bán
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
                            <AlertCircle className="w-3.5 h-3.5" /> Tạm ngưng / Hết hàng
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          {/* Nút Nhập kho (Restock) */}
                          <button
                            onClick={() => {
                              setRestockProduct(product);
                              setAdditionalQty(50);
                            }}
                            className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg transition text-xs font-semibold flex items-center gap-1.5"
                          >
                            <PackagePlus className="w-3.5 h-3.5" />
                            Nhập kho
                          </button>

                          {/* Nút Chỉnh sửa */}
                          <button
                            onClick={() => handleOpenEdit(product)}
                            className="px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/40 rounded-lg transition text-xs font-semibold flex items-center gap-1.5"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Chỉnh sửa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL NHẬP KHO (RESTOCK) */}
      {restockProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-emerald-400" />
                Nhập kho - {restockProduct.name}
              </h3>
              <button onClick={() => setRestockProduct(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-xl text-xs space-y-1 text-slate-300">
              <p>Mã sản phẩm: <span className="font-mono text-orange-400 font-bold">#{restockProduct.id}</span></p>
              <p>Tồn kho hiện tại: <span className="font-bold text-white">{restockProduct.stockQuantity}</span> sản phẩm</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Số lượng bổ sung (cộng dồn):
              </label>
              <input
                type="number"
                min={1}
                value={additionalQty}
                onChange={(e) => setAdditionalQty(Math.max(1, Number(e.target.value)))}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-bold text-lg focus:border-emerald-500 outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setRestockProduct(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition"
              >
                Hủy
              </button>
              <button
                onClick={() =>
                  restockMutation.mutate({
                    id: restockProduct.id,
                    quantity: additionalQty,
                  })
                }
                disabled={restockMutation.isPending}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-600/20 transition flex items-center gap-2 disabled:opacity-60"
              >
                {restockMutation.isPending ? 'Đang cập nhật...' : 'Xác nhận nhập kho'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHỈNH SỬA SẢN PHẨM */}
      {editProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-orange-400" />
                Chỉnh sửa Sản phẩm #{editProduct.id}
              </h3>
              <button onClick={() => setEditProduct(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <ImageUploader
                value={editForm.imageUrl || null}
                disabled={editMutation.isPending || isUploadingImage}
                onChange={(file) => {
                  setEditPendingFile(file);
                  // Nếu user bấm "Bỏ chọn ảnh" (file=null), clear URL trong form
                  // để PUT payload không gửi ảnh cũ.
                  if (!file) {
                    setEditForm((prev) => ({ ...prev, imageUrl: '', imagePublicId: '' }));
                  }
                }}
                onError={(message) =>
                  setNotification({ type: 'error', message })
                }
              />
              <div>
                <label className="block font-medium text-slate-300 mb-1">Tên sản phẩm:</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Giá bán (VNĐ):</label>
                <input
                  type="number"
                  value={editForm.price}
                  onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500 font-bold"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Xuất xứ:</label>
                <input
                  type="text"
                  value={editForm.origin}
                  onChange={(e) => setEditForm({ ...editForm, origin: e.target.value })}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <span className="font-medium text-slate-200">Trạng thái sẵn sàng bán:</span>
                <input
                  type="checkbox"
                  checked={editForm.isAvailable}
                  onChange={(e) => setEditForm({ ...editForm, isAvailable: e.target.checked })}
                  className="w-5 h-5 accent-orange-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <span className="font-medium text-slate-200">Sản phẩm HOT:</span>
                <input
                  type="checkbox"
                  checked={editForm.isHot}
                  onChange={(e) => setEditForm({ ...editForm, isHot: e.target.checked })}
                  className="w-5 h-5 accent-amber-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={handleCloseEdit}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition"
              >
                Hủy
              </button>
              <button
                onClick={() => editMutation.mutate()}
                disabled={editMutation.isPending || isUploadingImage}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-orange-500/20 transition flex items-center gap-2 disabled:opacity-60"
              >
                {editMutation.isPending || isUploadingImage
                  ? 'Đang lưu...'
                  : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM SẢN PHẨM MỚI */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-orange-400" />
                Thêm Sản phẩm Mới
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <ImageUploader
                value={createForm.imageUrl || null}
                disabled={createMutation.isPending || isUploadingImage}
                onChange={(file) => {
                  setCreatePendingFile(file);
                  if (!file) {
                    setCreateForm((prev) => ({ ...prev, imageUrl: '', imagePublicId: '' }));
                  }
                }}
                onError={(message) =>
                  setNotification({ type: 'error', message })
                }
              />
              <div>
                <label className="block font-medium text-slate-300 mb-1">Tên sản phẩm:</label>
                <input
                  type="text"
                  placeholder="Nhập tên sản phẩm..."
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Giá bán (VNĐ):</label>
                  <input
                    type="number"
                    value={createForm.price}
                    onChange={(e) => setCreateForm({ ...createForm, price: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Tồn kho ban đầu:</label>
                  <input
                    type="number"
                    value={createForm.stockQuantity}
                    onChange={(e) => setCreateForm({ ...createForm, stockQuantity: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Xuất xứ:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Việt Nam, Mỹ, Nhật..."
                  value={createForm.origin}
                  onChange={(e) => setCreateForm({ ...createForm, origin: e.target.value })}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={handleCloseCreate}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition"
              >
                Hủy
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={
                  createMutation.isPending ||
                  isUploadingImage ||
                  !createForm.name.trim()
                }
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-orange-500/20 transition flex items-center gap-2 disabled:opacity-60"
              >
                {createMutation.isPending || isUploadingImage
                  ? 'Đang tạo...'
                  : 'Tạo sản phẩm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
