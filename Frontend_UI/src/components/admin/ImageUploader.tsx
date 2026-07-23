import { useRef, useState } from 'react';
import { Upload, X, ImageOff, ImageIcon } from 'lucide-react';

export interface ImageUploaderSuccessPayload {
  url: string;
  publicId: string;
}

interface ImageUploaderProps {
  /**
   * URL ảnh hiện tại để preview (ví dụ: khi edit sản phẩm đã có ảnh trên Cloudinary).
   * Nếu truyền `null`/`undefined`, component sẽ hiển thị khung dashed trống.
   */
  value?: string | null;
  /**
   * Callback khi user chọn file MỚI hoặc xoá ảnh đang chọn.
   * Component KHÔNG tự upload — parent sẽ upload khi submit form.
   * - `file` là `File` khi user vừa chọn ảnh mới (chưa upload).
   * - `file` là `null` khi user bấm nút "Xoá" trên ảnh preview.
   */
  onChange: (file: File | null) => void;
  /** Khi form cha đang submit / disabled toàn bộ. */
  disabled?: boolean;
  /** (Tuỳ chọn) Callback để hiển thị lỗi validation client-side (sai MIME, quá dung lượng). */
  onError?: (message: string) => void;
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * ImageUploader (Deferred-upload mode) — Component upload ảnh dùng chung cho Admin.
 *
 * **Quy trình mới**:
 * 1. User click khung dashed → chọn file → component lưu `File` vào local state,
 *    hiển thị preview bằng **blob URL** (chưa gọi API).
 * 2. User có thể chọn file khác nhiều lần — chỉ giữ file cuối cùng.
 * 3. Khi user bấm "Lưu thay đổi" / "Tạo sản phẩm" → parent gọi API upload
 *    với file nhận được qua `onChange`, lấy URL trả về, gắn vào payload product.
 *
 * Ưu điểm so với upload-on-select:
 * - Không tốn request Cloudinary khi user cuối cùng chọn file khác / đóng modal.
 * - Không tạo "orphan" files trên Cloudinary.
 * - Network tối ưu (1 request upload = 1 request product create/update).
 *
 * Tuân thủ token của admin dark theme: bg-slate-800, border-slate-700,
 * text-slate-200, focus orange-500.
 */
export default function ImageUploader({
  value = null,
  onChange,
  disabled = false,
  onError,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // File user vừa chọn (chưa upload). Dùng blob URL để preview tức thì.
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  /**
   * Ảnh hiển thị ưu tiên theo thứ tự:
   *   1. `blobUrl` — file user vừa chọn, đang chờ upload
   *   2. `value`   — URL Cloudinary đã có (khi edit)
   */
  const previewUrl = blobUrl ?? value ?? null;

  const openPicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Định dạng không hỗ trợ. Vui lòng chọn ảnh PNG, JPG hoặc WEBP.';
    }
    if (file.size > MAX_SIZE_BYTES) {
      return 'Kích thước ảnh vượt quá 10MB. Vui lòng chọn ảnh nhỏ hơn.';
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input để cùng 1 file có thể chọn lại lần nữa
    e.target.value = '';
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setLocalError(validationError);
      onError?.(validationError);
      return;
    }

    setLocalError(null);
    // Cleanup blob URL cũ trước khi tạo cái mới
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    const newBlobUrl = URL.createObjectURL(file);
    setBlobUrl(newBlobUrl);
    setPendingFile(file);
    onChange(file);
  };

  const handleRemove = () => {
    if (disabled) return;
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    setPendingFile(null);
    setLocalError(null);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-300">
        Ảnh sản phẩm
      </label>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />

      {previewUrl ? (
        // ─── TRẠNG THÁI: CÓ ẢNH (đã upload hoặc đang chờ) ─────────────
        <div className="relative w-40 h-40 rounded-xl overflow-hidden border border-slate-700 bg-slate-800 group">
          <img
            src={previewUrl}
            alt="Preview sản phẩm"
            className="w-full h-full object-cover"
          />

          {/* Badge "chờ upload" — chỉ hiện khi ảnh từ file user vừa chọn */}
          {pendingFile && (
            <div className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/90 text-slate-950 text-[10px] font-bold shadow">
              <ImageIcon className="w-3 h-3" />
              Chờ lưu
            </div>
          )}

          {!disabled && (
            <div className="absolute top-1.5 right-1.5 flex gap-1.5">
              <button
                type="button"
                onClick={openPicker}
                className="w-8 h-8 rounded-full bg-slate-900/80 hover:bg-orange-500 text-white flex items-center justify-center shadow-lg transition"
                title="Đổi ảnh"
                aria-label="Đổi ảnh"
              >
                <Upload className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="w-8 h-8 rounded-full bg-red-500/90 hover:bg-red-500 text-white flex items-center justify-center shadow-lg transition"
                title={pendingFile ? 'Bỏ chọn ảnh' : 'Xoá ảnh'}
                aria-label={pendingFile ? 'Bỏ chọn ảnh' : 'Xoá ảnh'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        // ─── TRẠNG THÁI: TRỐNG — DASHED PICKER ────────────────────────
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled}
          className="w-40 h-40 rounded-xl border-2 border-dashed border-slate-600
                     bg-slate-800/40 hover:bg-slate-800 hover:border-orange-500
                     flex flex-col items-center justify-center gap-2
                     text-slate-400 hover:text-orange-400 transition
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {disabled ? (
            <ImageOff className="w-7 h-7" />
          ) : (
            <Upload className="w-7 h-7" />
          )}
          <span className="text-xs font-medium px-3 text-center leading-tight">
            Nhấn để chọn ảnh
          </span>
          <span className="text-[10px] text-slate-500">PNG, JPG, WEBP ≤ 10MB</span>
        </button>
      )}

      {localError && (
        <p className="text-xs text-red-400 flex items-center gap-1.5" role="alert">
          <X className="w-3 h-3 shrink-0" />
          {localError}
        </p>
      )}
    </div>
  );
}
