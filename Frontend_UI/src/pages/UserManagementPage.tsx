import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { RefreshCw, X } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import AdminLayout from '../components/AdminLayout';
import { normalizeTier, useAuthStore } from '../stores/useAuthStore';
import { accountError, isAccountEmail, matchesSession } from '../utils/account';
import type { UserProfile } from '../types/account';
import '../styles/admin-users.css';

export interface UserPaginatedResponse {
  items: UserProfile[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const roles: Record<string, string> = {
  Customer: 'Khách hàng', Admin: 'Quản trị viên', Shipper: 'Nhân viên giao hàng',
};
const roleLabel = (role: string) => Object.hasOwn(roles, role) ? roles[role] : role;
const tiers = { Standard: 'Tiêu chuẩn', Silver: 'Bạc', Gold: 'Vàng', Platinum: 'Bạch kim' };
const tierValues = ['Standard', 'Silver', 'Gold', 'Platinum'] as const;
const profileFields = [
  ['fullName', 'Họ tên'], ['email', 'Email'], ['phoneNumber', 'Điện thoại'],
  ['address1', 'Địa chỉ chính'], ['address2', 'Địa chỉ phụ'],
] as const;

function draftFor(user: UserProfile) {
  return {
    fullName: user.fullName, email: user.email, phoneNumber: user.phoneNumber ?? '',
    address1: user.address1 ?? '', address2: user.address2 ?? '',
    loyaltyPoints: String(user.loyaltyPoints), tier: tierValues.indexOf(normalizeTier(user.tier)),
    role: user.role,
  };
}

function temporaryPassword() {
  const groups = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789'];
  const random = (size: number) => crypto.getRandomValues(new Uint32Array(1))[0] % size;
  const pick = (alphabet: string) => alphabet[random(alphabet.length)];
  const chars = groups.map(pick);
  while (chars.length < 12) chars.push(pick(groups.join('')));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

type Action = { user: UserProfile; kind: 'edit' | 'password' };

function UsersContent({ userId, token }: { userId: number; token: string }) {
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState<Action | null>(null);
  const [draft, setDraft] = useState<ReturnType<typeof draftFor> | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmedRole, setConfirmedRole] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const gate = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const dialogTitle = useRef<HTMLHeadingElement>(null);
  const origin = useRef<HTMLButtonElement | null>(null);
  const pageTitle = useRef<HTMLHeadingElement>(null);
  const guard = () => {
    if (!matchesSession(useAuthStore.getState(), { token, userId })) {
      throw Error('Phiên làm việc đã thay đổi.');
    }
  };

  const query = useQuery({
    queryKey: ['admin-users', userId, page],
    queryFn: async ({ signal }) => {
      const data = await axiosClient.get<UserPaginatedResponse, UserPaginatedResponse>(
        '/api/users', { params: { page, pageSize: 10 }, signal },
      );
      guard();
      if (!data || !Array.isArray(data.items) || data.page !== page ||
          !Number.isInteger(data.totalPages) || data.totalPages < 0 ||
          !Number.isInteger(data.totalCount) || data.totalCount < 0 ||
          data.items.some(user => !user || !Number.isSafeInteger(user.id) || user.id < 1 ||
            typeof user.fullName !== 'string' || typeof user.email !== 'string' ||
            typeof user.role !== 'string' || !Number.isInteger(user.loyaltyPoints) ||
            [user.phoneNumber, user.address1, user.address2].some(value => value != null && typeof value !== 'string'))) {
        throw Error('Dữ liệu tài khoản không hợp lệ. Vui lòng tải lại.');
      }
      return data;
    },
  });
  const data = query.data;
  const term = search.trim().toLocaleLowerCase('vi');
  const rows = data?.items.filter(user =>
    [user.id, user.fullName, user.email, user.phoneNumber].some(value =>
      String(value ?? '').toLocaleLowerCase('vi').includes(term),
    ),
  ) ?? [];
  const roleChanged = action?.kind === 'edit' && draft?.role !== action.user.role;

  useEffect(() => {
    if (action) {
      dialog.current?.showModal();
      dialogTitle.current?.focus();
    } else if (dialog.current?.open) {
      dialog.current.close();
      if (origin.current?.isConnected && !origin.current.disabled) origin.current.focus();
      else pageTitle.current?.focus();
    }
  }, [action]);

  function open(kind: Action['kind'], user: UserProfile, event: MouseEvent<HTMLButtonElement>) {
    origin.current = event.currentTarget;
    setDraft(draftFor(user));
    setPassword('');
    setShowPassword(false);
    setConfirmedRole(false);
    setError('');
    setCopyMessage('');
    setNotice('');
    setAction({ user, kind });
  }

  function close() {
    if (gate.current) return;
    setAction(null);
    setPassword('');
    setShowPassword(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (gate.current || !action || !draft) return;
    const points = Number(draft.loyaltyPoints);
    if (action.kind === 'edit') {
      if (!draft.fullName.trim() || !isAccountEmail(draft.email.trim())) {
        setError('Nhập họ tên và email hợp lệ.');
        return;
      }
      if (!draft.loyaltyPoints.trim() || !Number.isInteger(points) || points < 0 || points > 2147483647) {
        setError('Nhập điểm tích lũy là số nguyên từ 0 đến 2.147.483.647.');
        return;
      }
      if (roleChanged && !confirmedRole) {
        setError('Xác nhận thay đổi vai trò trước khi lưu.');
        return;
      }
    } else if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    gate.current = true;
    setBusy(true);
    setError('');
    try {
      guard();
      const path = `/api/users/${action.user.id}`;
      if (action.kind === 'edit') {
        await axiosClient.put(path, {
          ...draft, fullName: draft.fullName.trim(), email: draft.email.trim(), loyaltyPoints: points,
          expectedLoyaltyPoints: action.user.loyaltyPoints, expectedTier: draftFor(action.user).tier,
        });
        guard();
        setNotice(`Đã lưu tài khoản #${action.user.id}.`);
        void client.invalidateQueries({ queryKey: ['admin-users', userId] });
      } else {
        await axiosClient.post(`${path}/reset-password`, { newPassword: password });
        guard();
        setNotice(`Đã cấp lại mật khẩu cho tài khoản #${action.user.id}.`);
      }
      setAction(null);
      setPassword('');
      setShowPassword(false);
    } catch (cause) {
      setError(accountError(cause));
    } finally {
      gate.current = false;
      setBusy(false);
    }
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(password);
      setCopyMessage('Đã sao chép mật khẩu.');
    } catch {
      setCopyMessage('Không sao chép được. Hiện mật khẩu để sao chép thủ công.');
    }
  }

  return (
    <main className="admin-users">
      <Helmet><title>Khách hàng | FoodDelivery</title></Helmet>
      <header className="au-heading">
        <h1 ref={pageTitle} tabIndex={-1}>Khách hàng</h1>
        <button className="au-button" disabled={query.isFetching} onClick={() => void query.refetch()}>
          <RefreshCw size={16} aria-hidden="true" /> Làm mới
        </button>
      </header>
      <div className="au-search">
        <label htmlFor="au-search">Tìm trên trang này</label>
        <input id="au-search" type="search" placeholder="Tên, mã, email hoặc số điện thoại"
          value={search} onChange={event => setSearch(event.target.value)} />
      </div>
      {notice && <p className="au-notice" role="status">{notice}</p>}
      {query.isPending && <p className="au-state" role="status">Đang tải tài khoản…</p>}
      {query.isError && (
        <div className="au-error" role="alert">
          <p>{accountError(query.error)}{data && ' Đang hiển thị dữ liệu lần tải trước.'}</p>
          <button className="au-button" disabled={query.isFetching} onClick={() => void query.refetch()}>Thử lại</button>
        </div>
      )}
      {data && <>
        <p className="au-count">{data.totalCount.toLocaleString('vi-VN')} tài khoản{term && ` · ${rows.length} kết quả trên trang này`}</p>
        {rows.length ? <table className="au-table">
          <caption className="sr-only">Danh sách tài khoản</caption>
          <thead><tr>{['Tài khoản', 'Vai trò', 'Thành viên', 'Thao tác'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
          <tbody>{rows.map(user => (
            <tr key={user.id}>
              <td><strong>{user.fullName || `Tài khoản #${user.id}`}</strong>
                <p className="au-muted">#{user.id} · {user.email}</p>
                {user.phoneNumber && <p className="au-muted">{user.phoneNumber}</p>}
              </td>
              <td><span className="au-role">{roleLabel(user.role)}</span></td>
              <td><strong>{tiers[normalizeTier(user.tier)]}</strong><p className="au-muted">{user.loyaltyPoints.toLocaleString('vi-VN')} điểm</p></td>
              <td><div className="au-actions">
                <button className="au-button" aria-label={`Sửa tài khoản #${user.id}`} disabled={query.isFetching} onClick={event => open('edit', user, event)}>Sửa</button>
                <button className="au-button" aria-label={`Cấp lại mật khẩu cho #${user.id}`} disabled={query.isFetching} onClick={event => open('password', user, event)}>Cấp lại mật khẩu</button>
              </div></td>
            </tr>
          ))}</tbody>
        </table> : <p className="au-state">{term ? 'Không tìm thấy tài khoản trên trang này.' : 'Chưa có tài khoản trên trang này.'}</p>}
        {data.totalPages > 1 && (
          <nav className="au-pagination" aria-label="Phân trang tài khoản">
            <button className="au-button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trang trước</button>
            <span>Trang {page} / {data.totalPages}</span>
            <button className="au-button" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>Trang sau</button>
          </nav>
        )}
      </>}

      <dialog className="au-dialog" ref={dialog} aria-labelledby="au-dialog-title"
        onCancel={event => { event.preventDefault(); close(); }}>
        {action && draft && <form onSubmit={submit}>
          <header>
            <h2 ref={dialogTitle} tabIndex={-1} id="au-dialog-title">
              {action.kind === 'edit' ? 'Sửa tài khoản' : 'Cấp lại mật khẩu'} #{action.user.id}
            </h2>
            <button type="button" className="au-button au-icon" aria-label="Đóng" disabled={busy} onClick={close}><X size={18} /></button>
          </header>
          <div className="au-dialog-body">
            <p className="au-subject">{action.user.fullName} · {action.user.email}</p>
            <fieldset disabled={busy}>
              {action.kind === 'edit' ? <>
                <div className="au-fields">
                  {profileFields.map(([key, label]) => (
                    <label key={key}>{label}
                      <input required={key === 'fullName' || key === 'email'}
                        type={key === 'email' ? 'email' : key === 'phoneNumber' ? 'tel' : 'text'}
                        value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} />
                    </label>
                  ))}
                  <label>Điểm tích lũy<input type="number" min={0} max={2147483647} step={1} required
                    value={draft.loyaltyPoints} onChange={event => setDraft({ ...draft, loyaltyPoints: event.target.value })} /></label>
                  <label>Hạng thành viên<select value={draft.tier} onChange={event => setDraft({ ...draft, tier: Number(event.target.value) })}>
                    {tierValues.map((tier, index) => <option key={tier} value={index}>{tiers[tier]}</option>)}
                  </select></label>
                  <label>Vai trò<select value={draft.role} onChange={event => {
                    setConfirmedRole(false);
                    setDraft({ ...draft, role: event.target.value });
                  }}>
                    {!Object.hasOwn(roles, action.user.role) && <option value={action.user.role}>{action.user.role}</option>}
                    {Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select></label>
                </div>
                {roleChanged && <label className="au-confirm">
                  <input type="checkbox" checked={confirmedRole} onChange={event => setConfirmedRole(event.target.checked)} />
                  <span>Xác nhận đổi vai trò của #{action.user.id} từ {roleLabel(action.user.role)} sang {roleLabel(draft.role)}.</span>
                </label>}
              </> : <>
                <label>Mật khẩu mới<input type={showPassword ? 'text' : 'password'} autoComplete="new-password"
                  required minLength={6} maxLength={100} value={password} onChange={event => { setPassword(event.target.value); setCopyMessage(''); }} /></label>
                <p className="au-muted">Ít nhất 6 ký tự. Mật khẩu mới thay thế mật khẩu hiện tại.</p>
                <div className="au-actions au-password-actions">
                  <button type="button" className="au-button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Ẩn' : 'Hiện'}</button>
                  <button type="button" className="au-button" onClick={() => { setPassword(temporaryPassword()); setCopyMessage(''); }}>Sinh mật khẩu</button>
                  <button type="button" className="au-button" disabled={!password} onClick={() => void copyPassword()}>Sao chép</button>
                </div>
                {copyMessage && <p className="au-muted" role="status">{copyMessage}</p>}
              </>}
            </fieldset>
          </div>
          <footer>
            {error && <p className="au-error" role="alert">{error}</p>}
            <button type="button" className="au-button" onClick={close} disabled={busy}>Quay lại</button>
            <button className="au-button au-primary" disabled={busy || (roleChanged && !confirmedRole)}>
              {busy ? 'Đang lưu…' : action.kind === 'edit' ? 'Lưu thay đổi' : 'Xác nhận cấp lại'}
            </button>
          </footer>
        </form>}
      </dialog>
    </main>
  );
}

export default function UserManagementPage() {
  const user = useAuthStore(state => state.user);
  const token = useAuthStore(state => state.token);
  return <AdminLayout>
    {user && token && user.role.toLowerCase() === 'admin'
      ? <UsersContent key={JSON.stringify([user.id, token])} userId={user.id} token={token} />
      : <main><h1>Khách hàng</h1></main>}
  </AdminLayout>;
}
