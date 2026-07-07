import { Outlet, Link, NavLink, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Logo } from '../Logo';
import { useCart } from '@/store/cart.ts';
import { CartDrawer } from './CartDrawer';
import { useAuth } from '@/store/auth.ts';

const navLinks = [
  { to: '/', label: 'الرئيسية' },
  { to: '/products', label: 'المنتجات' },
  { to: '/offers', label: 'العروض' },
  { to: '/contact', label: 'تواصل معنا' },
];

/* Scroll to top on every navigation */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

export function StoreLayout() {
  const count = useCart((s) => s.count());
  const openCart = useCart((s) => s.open);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { token } = useAuth();

  return (
      <div className="flex min-h-screen flex-col">
        <ScrollToTop />

        <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <Link to="/" aria-label="الصفحة الرئيسية">
              <Logo />
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              {navLinks.map((l) => (
                  <NavLink
                      key={l.to}
                      to={l.to}
                      end={l.to === '/'}
                      className={({ isActive }) =>
                          `rounded-xl px-4 py-2 text-sm font-medium transition ${
                              isActive ? 'bg-surface text-charcoal' : 'text-muted hover:text-charcoal'
                          }`
                      }
                  >
                    {l.label}
                  </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <button onClick={openCart} className="relative rounded-xl p-2.5 hover:bg-surface" aria-label="السلة">
                <ShoppingBag size={22} />
                {count > 0 && (
                    <span className="nums absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-lime px-1 text-xs font-bold text-lime-fg">
                  {count}
                </span>
                )}
              </button>
              <button
                  className="rounded-xl p-2.5 hover:bg-surface md:hidden"
                  onClick={() => setMobileOpen((v) => !v)}
                  aria-label="القائمة"
              >
                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>

          {mobileOpen && (
              <nav className="border-t border-line bg-white px-4 py-2 md:hidden">
                {navLinks.map((l) => (
                    <NavLink
                        key={l.to}
                        to={l.to}
                        end={l.to === '/'}
                        onClick={() => setMobileOpen(false)}
                        className="block rounded-xl px-4 py-3 text-sm font-medium text-charcoal hover:bg-surface"
                    >
                      {l.label}
                    </NavLink>
                ))}
              </nav>
          )}
        </header>

        <main className="flex-1">
          <Outlet />
        </main>

        <footer className="mt-16 bg-charcoal text-charcoal-fg">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
            <div>
              <div className="[&_*]:!text-white">
                <Logo />
              </div>
              <p className="mt-4 max-w-xs text-sm text-white/70">
                نظارات طبية وشمسية بأجود الخامات وأحدث الموديلات. رؤية أوضح، إطلالة أجمل.
              </p>
            </div>
            <div>
              <h4 className="mb-3 text-lime">روابط سريعة</h4>
              <ul className="space-y-2 text-sm text-white/80">
                {navLinks.map((l) => (
                    <li key={l.to}>
                      <Link to={l.to} className="hover:text-lime">
                        {l.label}
                      </Link>
                    </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-lime">تواصل</h4>
              <p className="text-sm text-white/80">جنين، فلسطين</p>
              <Link to={token ? '/admin/dashboard' : '/admin/login'} className="mt-4 inline-block text-xs text-white/40 hover:text-lime">
                لوحة التحكم
              </Link>
            </div>
          </div>
          <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
            <p>© {new Date().getFullYear()} Nora Optics — جميع الحقوق محفوظة</p>
            <p className="mt-1">
              Developed By:{" "}
              <a href="tel:+972597250539" className="hover:text-lime transition-colors">
                Ibrahem Herzallah · 059-725-0539
              </a>
            </p>
          </div>
        </footer>
        <CartDrawer />
      </div>
  );
}
