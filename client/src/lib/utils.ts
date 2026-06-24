// Minimal class combiner (shadcn uses clsx+tailwind-merge; this is dependency-free).
// Accepts strings/conditionals; later classes win by source order.
export function cn(...classes: Array<string | false | null | undefined>): string {
    return classes.filter(Boolean).join(' ');
}
