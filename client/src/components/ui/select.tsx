import * as React from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Context ─────────────────────────────────────────────────────────────────
interface SelectCtx {
    value: string;
    onValueChange: (v: string) => void;
    open: boolean;
    setOpen: (o: boolean) => void;
    registerLabel: (value: string, label: string) => void;
    getLabel: (value: string) => string | undefined;
}
const Ctx = React.createContext<SelectCtx | null>(null);
const useCtx = () => {
    const ctx = React.useContext(Ctx);
    if (!ctx) throw new Error('Select compound used outside <Select>');
    return ctx;
};

// ─── Root ─────────────────────────────────────────────────────────────────────
interface SelectProps {
    value: string;
    onValueChange: (v: string) => void;
    children: React.ReactNode;
}
export function Select({ value, onValueChange, children }: SelectProps) {
    const [open, setOpen] = React.useState(false);
    const labelsRef = React.useRef<Map<string, string>>(new Map());
    const ref = React.useRef<HTMLDivElement>(null);

    const registerLabel = React.useCallback((v: string, label: string) => {
        labelsRef.current.set(v, label);
    }, []);

    const getLabel = React.useCallback((v: string) => {
        return labelsRef.current.get(v);
    }, []);

    // close on outside click
    React.useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <Ctx.Provider value={{ value, onValueChange, open, setOpen, registerLabel, getLabel }}>
            <div ref={ref} className="relative">
                {children}
            </div>
        </Ctx.Provider>
    );
}

// ─── Trigger ──────────────────────────────────────────────────────────────────
interface SelectTriggerProps {
    children: React.ReactNode;
    className?: string;
}
export function SelectTrigger({ children, className }: SelectTriggerProps) {
    const { open, setOpen } = useCtx();
    return (
        <button
            type="button"
            onClick={() => setOpen(!open)}
            className={cn(
                'flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm transition',
                'hover:border-muted focus:outline-none focus:ring-2 focus:ring-lime/30',
                open && 'border-lime ring-2 ring-lime/20',
                className
            )}
        >
            {children}
            <ChevronDown
                size={16}
                className={cn('shrink-0 text-muted transition-transform duration-200', open && 'rotate-180')}
            />
        </button>
    );
}

// ─── Value ────────────────────────────────────────────────────────────────────
export function SelectValue({ placeholder }: { placeholder?: string }) {
    const { value, getLabel } = useCtx();
    // Re-render whenever value changes so we pick up registered labels.
    const label = getLabel(value);
    const display = label ?? (value || null);
    return (
        <span className={cn('flex-1 truncate text-right', !display && 'text-muted')}>
      {display ?? placeholder}
    </span>
    );
}

// ─── Content ──────────────────────────────────────────────────────────────────
export function SelectContent({ children }: { children: React.ReactNode }) {
    const { open } = useCtx();
    if (!open) return null;
    return (
        <div className="absolute right-0 top-full z-50 mt-1 w-full overflow-hidden rounded-xl border border-line bg-white shadow-lg">
            <div className="py-1">{children}</div>
        </div>
    );
}

// ─── Item ─────────────────────────────────────────────────────────────────────
interface SelectItemProps {
    value: string;
    children: React.ReactNode;
    className?: string;
}
export function SelectItem({ value, children, className }: SelectItemProps) {
    const { value: selected, onValueChange, setOpen, registerLabel } = useCtx();
    const isSelected = selected === value;

    // Register this item's label so SelectValue can look it up by value.
    // Using a ref callback so it runs on every render without causing loops.
    const label = typeof children === 'string' ? children : '';
    React.useEffect(() => {
        if (label) registerLabel(value, label);
    }, [value, label, registerLabel]);

    return (
        <button
            type="button"
            onClick={() => { onValueChange(value); setOpen(false); }}
            className={cn(
                'flex w-full items-center justify-between px-4 py-2.5 text-right text-sm transition',
                'hover:bg-surface',
                isSelected && 'font-semibold text-lime-hover',
                className
            )}
        >
            <span>{children}</span>
            {isSelected && <Check size={14} className="shrink-0 text-lime" />}
        </button>
    );
}
