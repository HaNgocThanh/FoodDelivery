/**
 * Module declaration cho AdminLiveChat (file .jsx, không có TS).
 *
 * Đặt ở thư mục riêng để TS không nhầm với khai báo của component.
 * tsconfig.app.json tự động include mọi file trong src/ nên chỉ cần
 * declare module đúng path mà AdminSupportPage đang import.
 */

declare module '@/components/admin/AdminLiveChat' {
  import type { ComponentType } from 'react';

  interface AdminLiveChatProps {
    hubUrl?: string;
    accessToken?: string | null;
  }

  const AdminLiveChat: ComponentType<AdminLiveChatProps>;
  export default AdminLiveChat;
}

declare module '@/components/admin/AdminLiveChat.jsx' {
  import type { ComponentType } from 'react';

  interface AdminLiveChatProps {
    hubUrl?: string;
    accessToken?: string | null;
  }

  const AdminLiveChat: ComponentType<AdminLiveChatProps>;
  export default AdminLiveChat;
}

declare module '@/components/common/CustomerLiveChat' {
  import type { ComponentType } from 'react';

  interface CustomerLiveChatProps {
    hubUrl?: string;
    defaultSenderName?: string;
    positionClass?: string;
  }

  const CustomerLiveChat: ComponentType<CustomerLiveChatProps>;
  export default CustomerLiveChat;
}

declare module '@/components/common/CustomerLiveChat.jsx' {
  import type { ComponentType } from 'react';

  interface CustomerLiveChatProps {
    hubUrl?: string;
    defaultSenderName?: string;
    positionClass?: string;
  }

  const CustomerLiveChat: ComponentType<CustomerLiveChatProps>;
  export default CustomerLiveChat;
}

declare module '../components/admin/AdminLiveChat' {
  import type { ComponentType } from 'react';

  interface AdminLiveChatProps {
    hubUrl?: string;
    accessToken?: string | null;
  }

  const AdminLiveChat: ComponentType<AdminLiveChatProps>;
  export default AdminLiveChat;
}

declare module '../components/admin/AdminLiveChat.jsx' {
  import type { ComponentType } from 'react';

  interface AdminLiveChatProps {
    hubUrl?: string;
    accessToken?: string | null;
  }

  const AdminLiveChat: ComponentType<AdminLiveChatProps>;
  export default AdminLiveChat;
}
