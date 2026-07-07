import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../../components/Logo';
import { useAuth } from '../../store/auth';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      navigate('/admin/dashboard');
    } catch (err) {
      setError("خطأ في اسم المستخدم او كلمة المرور");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-charcoal px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex justify-center">
          <Logo size={56} />
        </div>
        <h1 className="mb-6 text-center text-xl font-bold">لوحة التحكم</h1>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">اسم المستخدم</label>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label">كلمة المرور</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-destructive">{error}</div>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'جارٍ الدخول…' : 'تسجيل الدخول'}
          </button>
        </form>
      </div>
    </div>
  );
}
