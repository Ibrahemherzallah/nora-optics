import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps {
  id?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ id, checked = false, onCheckedChange, disabled, className }, ref) => (
    <button
      ref={ref}
      type="button"
      role="checkbox"
      id={id}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        'peer flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border border-line bg-white outline-none transition',
        'focus-visible:ring-2 focus-visible:ring-lime/40',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked && 'border-lime bg-lime text-lime-fg',
        className
      )}
    >
      {checked && <Check size={14} strokeWidth={3} />}
    </button>
  )
);
Checkbox.displayName = 'Checkbox';
