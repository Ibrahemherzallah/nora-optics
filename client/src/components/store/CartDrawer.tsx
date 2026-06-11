import { useNavigate } from 'react-router-dom';
import { X, Trash2, Minus, Plus } from 'lucide-react';
import { useCart } from '../../store/cart';
import { shekel } from '../../lib/format';

export function CartDrawer() {
  const { isOpen, close, items, remove, setQty, subtotal } = useCart();
  const navigate = useNavigate();

  return (
    <>
      {/* overlay */}
      <div
        className={`fixed inset-0 z-50 bg-charcoal/40 transition-opacity ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={close}
      />
      {/* panel — slides from the LEFT in RTL */}
      <aside
        className={`fixed bottom-0 left-0 top-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-line p-4">
          <h3 className="text-lg font-bold">السلة</h3>
          <button onClick={close} className="rounded-lg p-1.5 hover:bg-surface" aria-label="إغلاق">
            <X size={22} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-muted">
            <p>سلتك فارغة</p>
            <button onClick={close} className="btn-ghost">
              تصفّح المنتجات
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {items.map((i) => (
                <div key={`${i.productId}-${i.color}`} className="flex gap-3 rounded-xl border border-line p-2.5">
                  {i.image && <img src={i.image} alt={i.name} className="h-16 w-16 rounded-lg object-cover" />}
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{i.name}</div>
                    {i.color && <div className="text-xs text-muted">اللون: {i.color}</div>}
                    <div className="nums mt-1 text-sm font-bold text-lime-hover">{shekel(i.price)}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <button onClick={() => setQty(i.productId, i.color, i.quantity - 1)} className="rounded-md border border-line p-1 hover:bg-surface">
                        <Minus size={14} />
                      </button>
                      <span className="nums w-6 text-center text-sm">{i.quantity}</span>
                      <button onClick={() => setQty(i.productId, i.color, i.quantity + 1)} className="rounded-md border border-line p-1 hover:bg-surface">
                        <Plus size={14} />
                      </button>
                      <button onClick={() => remove(i.productId, i.color)} className="mr-auto rounded-md p-1 text-destructive hover:bg-red-50">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-line p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-muted">المجموع الفرعي</span>
                <span className="nums text-lg font-bold">{shekel(subtotal())}</span>
              </div>
              <p className="mb-3 text-xs text-muted">يُحتسب التوصيل عند الدفع حسب المنطقة.</p>
              <button
                className="btn-primary w-full"
                onClick={() => {
                  close();
                  navigate('/checkout');
                }}
              >
                إتمام الطلب
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
