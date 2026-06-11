import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Upload, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { Category } from '../../lib/types';
import { Modal, ErrorBox, EmptyRow } from '../../components/admin/Modal';

interface CategoryForm {
  _id?: string;
  name: string;
  description?: string;
  image: string;
}

export function CategoriesAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<CategoryForm | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => (await api.get<{ data: Category[] }>('/admin/categories')).data.data,
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-categories'] }),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">الأصناف</h1>
        <button className="btn-primary" onClick={() => setEditing({ name: '', description: '', image: '' })}>
          <Plus size={18} /> صنف جديد
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted">جارٍ التحميل…</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface text-right text-muted">
              <tr>
                <th className="p-3 font-medium">الصنف</th>
                <th className="p-3 font-medium">الوصف</th>
                <th className="p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {data?.map((c) => (
                <tr key={c._id} className="border-b border-line last:border-0">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {c.image && <img src={c.image} alt="" className="h-10 w-10 rounded-lg object-cover" />}
                      <span className="font-medium">{c.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-muted">{c.description || '—'}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <button className="rounded-lg p-2 hover:bg-surface" onClick={() => setEditing(c)}>
                        <Pencil size={16} />
                      </button>
                      <button
                        className="rounded-lg p-2 text-destructive hover:bg-red-50"
                        onClick={() => confirm(`حذف "${c.name}"؟`) && del.mutate(c._id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data?.length === 0 && <EmptyRow cols={3} text="لا توجد أصناف بعد." />}
            </tbody>
          </table>
        </div>
      )}

      {editing && <CategoryModal form={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function CategoryModal({ form, onClose }: { form: CategoryForm; onClose: () => void }) {
  const qc = useQueryClient();
  const [state, setState] = useState(form);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const save = useMutation({
    mutationFn: () => (state._id ? api.put(`/admin/categories/${state._id}`, state) : api.post('/admin/categories', state)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  const uploadImage = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('images', file);
      const { data } = await api.post<{ urls: string[] }>('/admin/uploads', fd);
      setState((s) => ({ ...s, image: data.urls[0] }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal title={state._id ? 'تعديل صنف' : 'صنف جديد'} onClose={onClose} maxWidth="max-w-lg">
      <div className="space-y-4">
        <div>
          <label className="label">الاسم *</label>
          <input className="input" value={state.name} onChange={(e) => setState({ ...state, name: e.target.value })} />
        </div>
        <div>
          <label className="label">الوصف</label>
          <textarea className="input" rows={2} value={state.description || ''} onChange={(e) => setState({ ...state, description: e.target.value })} />
        </div>
        <div>
          <label className="label">الصورة *</label>
          <div className="flex items-center gap-3">
            {state.image && <img src={state.image} alt="" className="h-16 w-16 rounded-xl object-cover" />}
            <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-line hover:bg-surface">
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} className="text-muted" />}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
            </label>
          </div>
        </div>
        <ErrorBox message={error} />
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-ghost" onClick={onClose}>
            إلغاء
          </button>
          <button className="btn-primary" disabled={save.isPending || !state.name || !state.image} onClick={() => save.mutate()}>
            {save.isPending ? 'جارٍ الحفظ…' : 'حفظ'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
