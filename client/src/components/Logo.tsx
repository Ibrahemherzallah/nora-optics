export function Logo({ size = 40, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <rect width="48" height="48" rx="12" fill="#3A3A3A" />
        {/* stylized glasses / N mark in lime */}
        <circle cx="16" cy="27" r="6.5" stroke="#8CC63F" strokeWidth="2.5" />
        <circle cx="32" cy="27" r="6.5" stroke="#8CC63F" strokeWidth="2.5" />
        <path d="M22.5 26.5 L25.5 26.5" stroke="#8CC63F" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M13 14 L13 23 L21 14 L21 23" stroke="#8CC63F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      {withText && (
        <div className="leading-tight">
          <div className="font-display text-base font-extrabold text-lime">Nora Optics</div>
          <div className="text-[11px] text-charcoal/70">مركز نورا للبصريات</div>
        </div>
      )}
    </div>
  );
}
