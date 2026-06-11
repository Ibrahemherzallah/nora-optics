import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, FolderTree, Receipt, Eye, Tag, ShoppingCart, LogOut } from 'lucide-react';
import { Logo } from '../Logo';
import { useAuth } from '../../store/auth';

const tabs = [
  { to: '/admin/dashboard', label: 'لوحة المعلومات', icon: LayoutDashboard },
  { to: '/admin/products', label: 'المنتجات', icon: Package },
  { to: '/admin/categories', label: 'الأصناف', icon: FolderTree },
  { to: '/admin/sale-files', label: 'ملفات البيع', icon: Receipt },
  { to: '/admin/eye-exams', label: 'فحوصات النظر', icon: Eye },
  { to: '/admin/offers', label: 'العروض', icon: Tag },
  { to: '/admin/orders', label: 'الطلبات', icon: ShoppingCart },
];

export function AdminLayout() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="no-print sticky top-0 hidden h-screen w-60 flex-col bg-charcoal text-charcoal-fg md:flex">
        <div className="border-b border-white/10 p-4 [&_*]:!text-white">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-lime text-lime-fg' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <t.icon size={18} />
              {t.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className="mb-2 px-3 text-xs text-white/50">{username}</div>
          <button
            onClick={() => {
              logout();
              navigate('/admin/login');
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white"
          >
            <LogOut size={18} />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* mobile top bar */}
      <div className="flex flex-1 flex-col">
        <div className="no-print flex items-center gap-2 overflow-x-auto border-b border-line bg-charcoal p-2 md:hidden">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-1.5 text-xs ${isActive ? 'bg-lime text-lime-fg' : 'text-white/70'}`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </div>
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
