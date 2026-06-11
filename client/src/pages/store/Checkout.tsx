import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useCart } from '../../store/cart';
import { shekel, DELIVERY } from '../../lib/format';
import { DeliveryZone } from '../../lib/types';

interface FormValues {
  customerName: string;
  phone: string;
  address?: string;
  age?: string;
  sex?: '' | 'male' | 'female';
  deliveryZone: DeliveryZone;
}

export function Checkout() {
  const { items, subtotal, clear } = useCart();
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: { deliveryZone: 'westbank' } });

  const zone = watch('deliveryZone');
  const fee = DELIVERY[zone]?.fee ?? 0;
  const sub = subtotal();

  const onSubmit = async (v: FormValues) => {
    setServerError(null);
    try {
      // Client sends only identifiers + quantity — server recomputes all prices.
      const payload = {
        items: items.map((i) => ({ productId: i.productId, color: i.color, quantity: i.quantity })),
        customerName: v.customerName,
        phone: v.phone,
        address: v.address || undefined,
        age: v.age ? Number(v.age) : undefined,
        sex: v.sex || undefined,
        deliveryZone: v.deliveryZone,
      };
      const { data } = await api.post<{ orderNumber: string }>('/orders', payload);
      clear();
      setOrderNumber(data.orderNumber);
    } catch (e) {
      setServerError((e as Error).message);
    }
  };

  if (orderNumber) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <CheckCircle2 size={64} className="mx-auto text-lime" />
        <h1 className="mt-4 text-2xl font-bold">تم استلام طلبك!</h1>
        <p className="mt-2 text-muted">رقم الطلب</p>
        <p className="nums my-2 text-2xl font-extrabold text-charcoal">{orderNumber}</p>
        <p className="text-sm text-muted">سنتواصل معك لتأكيد الطلب وموعد التوصيل.</p>
        <Link to="/products" className="btn-primary mt-8">
          متابعة التسوّق
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center text-muted">
        <p>سلتك فارغة.</p>
        <Link to="/products" className="btn-primary mt-6">
          تصفّح المنتجات
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">إتمام الطلب</h1>
      <div className="grid gap-8 md:grid-cols-[1fr,360px]">
        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">الاسم الكامل *</label>
            <input className="input" {...register('customerName', { required: 'الاسم مطلوب' })} />
            {errors.customerName && <p className="mt-1 text-xs text-destructive">{errors.customerName.message}</p>}
          </div>
          <div>
            <label className="label">رقم الهاتف *</label>
            <input
              className="input nums"
              inputMode="numeric"
              placeholder="05XXXXXXXX"
              {...register('phone', {
                required: 'رقم الهاتف مطلوب',
                pattern: { value: /^\d{10}$/, message: 'يجب أن يكون 10 أرقام' },
              })}
            />
            {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>}
          </div>
          <div>
            <label className="label">العنوان</label>
            <input className="input" {...register('address')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">العمر</label>
              <input className="input nums" type="number" min={0} {...register('age')} />
            </div>
            <div>
              <label className="label">الجنس</label>
              <select className="input" {...register('sex')}>
                <option value="">—</option>
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">منطقة التوصيل *</label>
            <select className="input" {...register('deliveryZone', { required: true })}>
              {(Object.keys(DELIVERY) as DeliveryZone[]).map((z) => (
                <option key={z} value={z}>
                  {DELIVERY[z].label} — {DELIVERY[z].fee} ₪
                </option>
              ))}
            </select>
          </div>

          {serverError && <div className="rounded-xl bg-red-50 p-3 text-sm text-destructive">{serverError}</div>}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? 'جارٍ الإرسال…' : 'تأكيد الطلب'}
          </button>
        </form>

        {/* Summary */}
        <aside className="h-fit rounded-2xl border border-line bg-surface p-5">
          <h3 className="mb-4 font-bold">ملخص الطلب</h3>
          <div className="space-y-3">
            {items.map((i) => (
              <div key={`${i.productId}-${i.color}`} className="flex gap-3">
                {i.image && <img src={i.image} alt={i.name} className="h-12 w-12 rounded-lg object-cover" />}
                <div className="flex-1 text-sm">
                  <div className="font-medium">{i.name}</div>
                  <div className="nums text-xs text-muted">
                    {i.quantity} × {shekel(i.price)}
                  </div>
                </div>
                <div className="nums text-sm font-semibold">{shekel(i.price * i.quantity)}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <Row label="المجموع الفرعي" value={shekel(sub)} />
            <Row label="التوصيل" value={shekel(fee)} />
            <div className="flex items-center justify-between border-t border-line pt-2 text-base font-bold">
              <span>الإجمالي</span>
              <span className="nums text-lime-hover">{shekel(sub + fee)}</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">الأسعار النهائية تُحتسب من الخادم عند التأكيد.</p>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="nums">{value}</span>
    </div>
  );
}
