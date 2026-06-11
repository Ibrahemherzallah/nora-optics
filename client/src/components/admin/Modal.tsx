import { X } from 'lucide-react';

export function Modal({
  title,
  onClose,
  children,
  maxWidth = 'max-w-2xl',
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-charcoal/40 p-4">
      <div className={`my-8 w-full ${maxWidth} rounded-2xl bg-white p-6 shadow-2xl`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-surface" aria-label="إغلاق">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ErrorBox({ message }: { message?: string | null }) {
  if (!message) return null;
  return <div className="rounded-xl bg-red-50 p-3 text-sm text-destructive">{message}</div>;
}

export function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return (
    <tr>
      <td colSpan={cols} className="p-12 text-center text-muted">
        {text}
      </td>
    </tr>
  );
}
