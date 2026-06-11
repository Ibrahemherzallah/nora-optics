export const DELIVERY = {
  westbank: { label: 'الضفة الغربية', fee: 20 },
  jerusalem: { label: 'القدس', fee: 30 },
  inside48: { label: 'أراضي ٤٨', fee: 70 },
} as const;

// Western digits for commerce clarity (PRD §3.2). Wrap output in <span className="nums">.
export function shekel(n: number): string {
  return `${n.toLocaleString('en-US', { maximumFractionDigits: 2 })} ₪`;
}

export const STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكد',
  out_for_delivery: 'قيد التوصيل',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
};

export const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  out_for_delivery: 'bg-purple-100 text-purple-800',
  delivered: 'bg-lime/20 text-lime-hover',
  cancelled: 'bg-red-100 text-destructive',
};
