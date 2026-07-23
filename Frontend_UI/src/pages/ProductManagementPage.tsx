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
  Flame,
  Eye,
  Trash2,
  Save,
  Upload as UploadIcon
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
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: (err: Error) => {
      setNotification({ type: 'error', message: err.message || 'Không thể nhập kho sản phẩm.' });
    },
  });

  // Mutation Chỉnh sửa (PUT /api/products/{id})
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
      <main className="p-6 lg:p-8 space-y-6 min-h-screen bg-slate-50">

        {/* HEADER */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600">
                <Boxes className="w-6 h-6" />
              </span>
              Quản lý Sản phẩm &amp; Nhập kho
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Theo dõi tồn kho thực tế, nhập kho bổ sung và cập nhật danh mục hàng hóa
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 hover:border-slate-300 transition text-sm font-semibold shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Làm mới
            </button>

            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-lg shadow-sm hover:shadow-md transition text-sm font-bold"
            >
              <Plus className="w-4 h-4" />
              Thêm sản phẩm mới
            </button>
          </div>
        </header>

        {/* NOTIFICATION TOAST */}
        {notification && (
          <div
            role="alert"
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 shadow-sm ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-3">
              {notification.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              )}
              <span className="text-sm font-semibold">{notification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              aria-label="Đóng thông báo"
              className="text-slate-400 hover:text-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* TABLE CONTAINER — Modern Data Table */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
              <span className="text-sm">Đang tải danh sách sản phẩm...</span>
            </div>
          ) : isError ? (
            <div className="p-12 text-center text-red-600 flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8" />
              <span className="text-sm font-semibold">Không thể tải dữ liệu sản phẩm từ server.</span>
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
              <Boxes className="w-10 h-10 text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">Chưa có sản phẩm nào trong kho</p>
              <p className="text-xs text-slate-500">Bấm "Thêm sản phẩm mới" để bắt đầu.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                    <th scope="col" className="py-3.5 px-6">ID</th>
                    <th scope="col" className="py-3.5 px-6">Tên sản phẩm</th>
                    <th scope="col" className="py-3.5 px-6">Giá niêm yết</th>
                    <th scope="col" className="py-3.5 px-6">Tồn kho</th>
                    <th scope="col" className="py-3.5 px-6">Trạng thái</th>
                    <th scope="col" className="py-3.5 px-6 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50 transition">
                      <td className="py-4 px-6 font-mono font-bold text-emerald-700 whitespace-nowrap">
                        #{product.id}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900">{product.name}</span>
                          {product.isHot && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                              <Flame className="w-3 h-3 fill-amber-500 text-amber-500" /> HOT
                            </span>
                          )}
                        </div>
                        {product.origin && (
                          <span className="text-xs text-slate-500 block mt-0.5">Xuất xứ: {product.origin}</span>
                        )}
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-900 whitespace-nowrap tabular-nums">
                        {product.price?.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${
                            product.stockQuantity === 0
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : product.stockQuantity <= 10
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {product.stockQuantity} sản phẩm
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {product.isAvailable && product.stockQuantity > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3.5 h-3.5" /> Sẵn sàng bán
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                            <AlertCircle className="w-3.5 h-3.5" /> Tạm ngưng / Hết hàng
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-1" role="group" aria-label="Thao tác">
                          <button
                            type="button"
                            onClick={() => {
                              setRestockProduct(product);
                              setAdditionalQty(50);
                            }}
                            title="Nhập kho"
                            aria-label="Nhập kho"
                            data-testid={`button-restock-${product.id}`}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition"
                          >
                            <PackagePlus className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(product)}
                            title="Xem chi tiết"
                            aria-label="Xem chi tiết"
                            data-testid={`button-view-${product.id}`}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-sky-600 hover:bg-sky-50 hover:text-sky-700 transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(product)}
                            title="Chỉnh sửa"
                            aria-label="Chỉnh sửa"
                            data-testid={`button-edit-${product.id}`}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            title="Xóa (chưa hỗ trợ)"
                            aria-label="Xóa"
                            disabled
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 cursor-not-allowed opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* MODAL NHẬP KHO (RESTOCK) */}
      {restockProduct && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setRestockProduct(null)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-labelledby="restock-title"
               className="absolute inset-0 flex items-center justify-center p-4">
            <div className="relative bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-5 shadow-xl">
              <header className="flex justify-between items-center pb-4 border-b border-slate-200">
                <h3 id="restock-title" className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <PackagePlus className="w-5 h-5 text-emerald-600" />
                  Nhập kho - <span className="text-emerald-700">{restockProduct.name}</span>
                </h3>
                <button type="button" onClick={() => setRestockProduct(null)} aria-label="Đóng" className="text-slate-400 hover:text-slate-700 transition">
                  <X className="w-5 h-5" />
                </button>
              </header>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1 text-slate-700">
                <p>Mã sản phẩm: <span className="font-mono text-emerald-700 font-bold">#{restockProduct.id}</span></p>
                <p>Tồn kho hiện tại: <span className="font-bold text-slate-900">{restockProduct.stockQuantity}</span> sản phẩm</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="restock-qty" className="block text-sm font-semibold text-slate-700">
                  Số lượng bổ sung (cộng dồn):
                </label>
                <input
                  id="restock-qty"
                  type="number"
                  min={1}
                  value={additionalQty}
                  onChange={(e) => setAdditionalQty(Math.max(1, Number(e.target.value)))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                />
              </div>

              <footer className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setRestockProduct(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold transition"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() =>
                    restockMutation.mutate({
                      id: restockProduct.id,
                      quantity: additionalQty,
                    })
                  }
                  disabled={restockMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm hover:shadow-md transition disabled:opacity-60"
                >
                  {restockMutation.isPending ? 'Đang cập nhật...' : 'Xác nhận nhập kho'}
                </button>
              </footer>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHỈNH SỬA SẢN PHẨM — 2-column layout, sticky bottom actions */}
      {editProduct && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={handleCloseEdit} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-labelledby="edit-title"
               className="absolute inset-0 flex items-center justify-center p-4">
            <div className="relative bg-white border border-slate-200 rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-xl">
              {/* Header */}
              <header className="flex justify-between items-center px-6 py-4 border-b border-slate-200 flex-shrink-0">
                <h3 id="edit-title" className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-amber-600" />
                  Chỉnh sửa Sản phẩm <span className="font-mono text-emerald-700">#{editProduct.id}</span>
                </h3>
                <button type="button" onClick={handleCloseEdit} aria-label="Đóng" className="text-slate-400 hover:text-slate-700 transition">
                  <X className="w-5 h-5" />
                </button>
              </header>

              {/* Body — 2 columns */}
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-5 text-sm">
                {/* Cột trái (1/3): Hình ảnh */}
                <div className="md:col-span-1 space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Ảnh sản phẩm</label>
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-3 bg-slate-50">
                    <ImageUploader
                      value={editForm.imageUrl || null}
                      disabled={editMutation.isPending || isUploadingImage}
                      onChange={(file) => {
                        setEditPendingFile(file);
                        if (!file) {
                          setEditForm((prev) => ({ ...prev, imageUrl: '', imagePublicId: '' }));
                        }
                      }}
                      onError={(message) =>
                        setNotification({ type: 'error', message })
                      }
                    />
                  </div>
                  <div className="hidden md:flex items-start gap-2 text-xs text-slate-500 bg-sky-50 border border-sky-200 rounded-lg p-2.5">
                    <UploadIcon className="w-3.5 h-3.5 text-sky-600 mt-0.5 flex-shrink-0" />
                    <span>Ảnh chỉ upload khi bấm <strong>Lưu thay đổi</strong>.</span>
                  </div>
                </div>

                {/* Cột phải (2/3): Form fields */}
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <label htmlFor="edit-name" className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Tên sản phẩm <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="edit-name"
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="edit-price" className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Giá bán (VNĐ)
                      </label>
                      <input
                        id="edit-price"
                        type="number"
                        value={editForm.price}
                        onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold tabular-nums outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-origin" className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Xuất xứ
                      </label>
                      <input
                        id="edit-origin"
                        type="text"
                        value={editForm.origin}
                        onChange={(e) => setEditForm({ ...editForm, origin: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="edit-description" className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Mô tả sản phẩm
                    </label>
                    <textarea
                      id="edit-description"
                      rows={6}
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder="Nhập mô tả chi tiết cho sản phẩm..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 leading-relaxed outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition resize-y min-h-[140px]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition">
                      <span className="font-semibold text-slate-700 text-sm">Sẵn sàng bán</span>
                      <input
                        type="checkbox"
                        checked={editForm.isAvailable}
                        onChange={(e) => setEditForm({ ...editForm, isAvailable: e.target.checked })}
                        className="w-5 h-5 accent-emerald-500 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition">
                      <span className="font-semibold text-slate-700 text-sm flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-500" /> Sản phẩm HOT
                      </span>
                      <input
                        type="checkbox"
                        checked={editForm.isHot}
                        onChange={(e) => setEditForm({ ...editForm, isHot: e.target.checked })}
                        className="w-5 h-5 accent-amber-500 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Sticky Footer — Luôn nhìn thấy */}
              <footer className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex-shrink-0">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold transition"
                >
                  <X className="w-4 h-4" /> Hủy
                </button>
                <button
                  type="button"
                  onClick={() => editMutation.mutate()}
                  disabled={editMutation.isPending || isUploadingImage}
                  data-testid="button-save-edit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm hover:shadow-md transition disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  {editMutation.isPending || isUploadingImage ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </footer>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM SẢN PHẨM MỚI — 2-column layout, sticky bottom */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={handleCloseCreate} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-labelledby="create-title"
               className="absolute inset-0 flex items-center justify-center p-4">
            <div className="relative bg-white border border-slate-200 rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-xl">
              <header className="flex justify-between items-center px-6 py-4 border-b border-slate-200 flex-shrink-0">
                <h3 id="create-title" className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-600" />
                  Thêm Sản phẩm Mới
                </h3>
                <button type="button" onClick={handleCloseCreate} aria-label="Đóng" className="text-slate-400 hover:text-slate-700 transition">
                  <X className="w-5 h-5" />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-5 text-sm">
                <div className="md:col-span-1 space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Ảnh sản phẩm</label>
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-3 bg-slate-50">
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
                  </div>
                  <div className="hidden md:flex items-start gap-2 text-xs text-slate-500 bg-sky-50 border border-sky-200 rounded-lg p-2.5">
                    <UploadIcon className="w-3.5 h-3.5 text-sky-600 mt-0.5 flex-shrink-0" />
                    <span>Ảnh sẽ được upload lên Cloudinary khi bấm <strong>Tạo sản phẩm</strong>.</span>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                  <div>
                    <label htmlFor="create-name" className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Tên sản phẩm <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="create-name"
                      type="text"
                      placeholder="Nhập tên sản phẩm..."
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="create-price" className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Giá bán (VNĐ)
                      </label>
                      <input
                        id="create-price"
                        type="number"
                        value={createForm.price}
                        onChange={(e) => setCreateForm({ ...createForm, price: Number(e.target.value) })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold tabular-nums outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                      />
                    </div>
                    <div>
                      <label htmlFor="create-stock" className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Tồn kho ban đầu
                      </label>
                      <input
                        id="create-stock"
                        type="number"
                        value={createForm.stockQuantity}
                        onChange={(e) => setCreateForm({ ...createForm, stockQuantity: Number(e.target.value) })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold tabular-nums outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="create-origin" className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Xuất xứ
                      </label>
                      <input
                        id="create-origin"
                        type="text"
                        placeholder="Việt Nam, Mỹ, Nhật..."
                        value={createForm.origin}
                        onChange={(e) => setCreateForm({ ...createForm, origin: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                      />
                    </div>
                    <div>
                      <label htmlFor="create-category" className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Danh mục (ID)
                      </label>
                      <input
                        id="create-category"
                        type="number"
                        min={1}
                        value={createForm.categoryId}
                        onChange={(e) => setCreateForm({ ...createForm, categoryId: Number(e.target.value) })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold tabular-nums outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="create-description" className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Mô tả sản phẩm
                    </label>
                    <textarea
                      id="create-description"
                      rows={6}
                      value={createForm.description}
                      onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                      placeholder="Mô tả chi tiết giúp khách hàng hiểu rõ hơn về sản phẩm (nguồn gốc, cách bảo quản, hạn sử dụng...)"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 leading-relaxed outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition resize-y min-h-[140px]"
                    />
                  </div>
                </div>
              </div>

              <footer className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex-shrink-0">
                <button
                  type="button"
                  onClick={handleCloseCreate}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold transition"
                >
                  <X className="w-4 h-4" /> Hủy
                </button>
                <button
                  type="button"
                  onClick={() => createMutation.mutate()}
                  disabled={
                    createMutation.isPending ||
                    isUploadingImage ||
                    !createForm.name.trim()
                  }
                  data-testid="button-save-create"
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm hover:shadow-md transition disabled:opacity-60"
                >
                  <Plus className="w-4 h-4" />
                  {createMutation.isPending || isUploadingImage ? 'Đang tạo...' : 'Tạo sản phẩm'}
                </button>
              </footer>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
