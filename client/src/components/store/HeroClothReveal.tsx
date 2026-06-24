import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, ChevronDown } from 'lucide-react';

type Props = {
  /** number of rendered frame files on disk: frame_0001 … frame_{totalFrames} */
  totalFrames?: number;
  /** how many frames to actually load on small screens (sampled evenly from totalFrames) */
  mobileFrames?: number;
  /** scroll distance the pin lasts, in vh. 300 = three viewports of scrubbing */
  scrollVh?: number;
  mobileScrollVh?: number;
  /** builder for a frame URL given its 1-based index */
  framePath?: (i: number) => string;
  /** shown while loading and as the layer behind the canvas (default = first frame) */
  posterSrc?: string;
  /** shown in static / reduced-motion / slow-connection mode (default = last frame) */
  finalSrc?: string;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const defaultFramePath = (i: number) => `/hero/frame_${String(i).padStart(4, '0')}.webp`;

const prefersReduced = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const isSmall = () => typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 768px)').matches;
const isSaveDataOrSlow = () => {
  const c = (navigator as any)?.connection;
  if (!c) return false;
  return !!c.saveData || /(^|-)(2g|slow-2g)$/.test(c.effectiveType || '');
};

/** evenly-spaced 1-based indices, always including the first and last frame */
function sampleIndices(total: number, count: number): number[] {
  if (count >= total) return Array.from({ length: total }, (_, i) => i + 1);
  const out: number[] = [];
  for (let k = 0; k < count; k++) out.push(Math.round(1 + (k * (total - 1)) / (count - 1)));
  return Array.from(new Set(out));
}

export function HeroClothReveal({
  totalFrames = 120,
  mobileFrames = 48,
  scrollVh = 300,
  mobileScrollVh = 220,
  framePath = defaultFramePath,
  posterSrc,
  finalSrc,
}: Props) {
  // Decide the rendering mode ONCE on mount (avoids mode flips on resize).
  const [{ mode, frameCount, vh }] = useState(() => {
    const small = isSmall();
    if (prefersReduced() || (small && isSaveDataOrSlow())) {
      return { mode: 'static' as const, frameCount: 0, vh: 100 };
    }
    return {
      mode: 'scrub' as const,
      frameCount: small ? Math.min(mobileFrames, totalFrames) : totalFrames,
      vh: small ? mobileScrollVh : scrollVh,
    };
  });

  const poster = posterSrc ?? framePath(1);
  const last = finalSrc ?? framePath(totalFrames);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const curFrame = useRef(0);

  const [ready, setReady] = useState(mode === 'static');
  const [loadPct, setLoadPct] = useState(0);

  // ---- Preload + decode every frame up front (never decode in the scroll handler) ----
  useEffect(() => {
    if (mode !== 'scrub') return;
    let cancelled = false;
    const indices = sampleIndices(totalFrames, frameCount);
    const imgs: HTMLImageElement[] = new Array(indices.length);
    let done = 0;

    const onDone = () => {
      if (cancelled) return;
      done++;
      setLoadPct(done / indices.length);
      if (done === indices.length) {
        imagesRef.current = imgs;
        setReady(true);
      }
    };

    indices.forEach((idx, k) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = framePath(idx);
      const finish = () =>
        (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).finally(onDone);
      if (img.complete && img.naturalWidth) finish();
      else {
        img.onload = finish;
        img.onerror = onDone; // count errors so a single 404 can't hang the loader
      }
      imgs[k] = img;
    });

    return () => {
      cancelled = true;
      imagesRef.current = []; // release decoded bitmaps for GC on unmount
    };
  }, [mode, totalFrames, frameCount, framePath]);

  // ---- Scrub loop: scroll → frame index, lerped, drawn to canvas ----
  useEffect(() => {
    if (mode !== 'scrub' || !ready) return;
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const overlay = overlayRef.current;
    const hint = hintRef.current;
    const ctx = canvas.getContext('2d', { alpha: false })!;
    const imgs = imagesRef.current;
    const N = imgs.length;
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap DPR — iOS canvas memory

    let lastDrawn = -1;

    const drawCover = (img: HTMLImageElement) => {
      const cw = canvas.width;
      const ch = canvas.height;
      const ir = img.naturalWidth / img.naturalHeight;
      let dw = cw,
        dh = ch,
        dx = 0,
        dy = 0;
      if (cw / ch > ir) {
        dh = cw / ir;
        dy = (ch - dh) / 2;
      } else {
        dw = ch * ir;
        dx = (cw - dw) / 2;
      }
      ctx.drawImage(img, dx, dy, dw, dh);
    };

    const drawFrame = (f: number, force = false) => {
      const idx = clamp(Math.round(f), 0, N - 1);
      if (idx === lastDrawn && !force) return;
      const img = imgs[idx];
      if (img && img.naturalWidth) {
        drawCover(img);
        lastDrawn = idx;
      }
    };

    const resize = () => {
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(cssW * dpr));
      canvas.height = Math.max(1, Math.floor(cssH * dpr));
      drawFrame(curFrame.current, true); // redraw current frame at new size
    };

    const progress = () => {
      const top = wrap.getBoundingClientRect().top;
      const total = wrap.offsetHeight - window.innerHeight;
      return total > 0 ? clamp(-top / total, 0, 1) : 0;
    };

    let raf = 0;
    let inView = true;

    const tick = () => {
      const p = progress();
      const target = p * (N - 1);
      // lerp toward target for buttery scrubbing
      curFrame.current += (target - curFrame.current) * 0.18;
      if (Math.abs(target - curFrame.current) < 0.01) curFrame.current = target;
      drawFrame(curFrame.current);

      if (overlay) {
        const fade = clamp((p - 0.55) / 0.35, 0, 1); // stays pinned, fades over the last ~35%
        overlay.style.opacity = String(1 - fade);
        overlay.style.transform = `translateY(${fade * -40}px)`;
        overlay.style.pointerEvents = fade > 0.8 ? 'none' : 'auto';
      }
      if (hint) hint.style.opacity = String(clamp(1 - p * 3, 0, 1));

      if (inView) raf = requestAnimationFrame(tick);
    };

    // Only run the loop while the hero is on screen (battery friendly).
    const io = new IntersectionObserver(
      ([e]) => {
        const wasOut = !inView;
        inView = e.isIntersecting;
        if (inView && wasOut) {
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(tick);
        }
      },
      { threshold: 0 }
    );
    io.observe(wrap);

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [mode, ready]);

  // ---------- Overlay content (your existing badge / headline / CTAs) ----------
  const Overlay = (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4 text-center"
      style={{ willChange: 'opacity, transform' }}
    >
      <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-white/90 backdrop-blur">
        <Sparkles size={14} className="text-lime" /> مركز نورا للبصريات
      </span>
      <h1 className="text-4xl font-extrabold leading-tight text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.5)] md:text-6xl">
        رؤية أوضح، <span className="text-lime">إطلالة أجمل</span>
      </h1>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link to="/products" className="btn-primary">
          تسوّق الآن <ArrowLeft size={18} />
        </Link>
        <Link to="/offers" className="btn-ghost border-white/30 text-white hover:bg-white/10">
          شاهد العروض
        </Link>
      </div>
    </div>
  );

  // ---------- Static / reduced-motion / slow-connection fallback ----------
  if (mode === 'static') {
    return (
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-charcoal">
        <img src={last} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/20 to-charcoal/40" />
        <div className="relative z-10 px-4 text-center">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-white/90 backdrop-blur">
            <Sparkles size={14} className="text-lime" /> مركز نورا للبصريات
          </span>
          <h1 className="text-4xl font-extrabold leading-tight text-white md:text-6xl">
            رؤية أوضح، <span className="text-lime">إطلالة أجمل</span>
          </h1>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/products" className="btn-primary">
              تسوّق الآن <ArrowLeft size={18} />
            </Link>
            <Link to="/offers" className="btn-ghost border-white/30 text-white hover:bg-white/10">
              شاهد العروض
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // ---------- Scrub mode ----------
  return (
    <div ref={wrapRef} style={{ height: `${vh}vh` }} className="relative">
      <div className="sticky top-0 h-screen overflow-hidden bg-charcoal">
        {/* poster sits behind the canvas: seamless handoff, no black flash, fallback if a frame fails */}
        <img src={poster} alt="" className="absolute inset-0 z-0 h-full w-full object-cover" />
        <canvas ref={canvasRef} className="absolute inset-0 z-[1] h-full w-full" />
        {/* legibility gradient */}
        <div className="absolute inset-0 z-[2] bg-gradient-to-t from-charcoal/70 via-transparent to-charcoal/30" />

        {Overlay}

        {/* scroll hint */}
        <div ref={hintRef} className="absolute bottom-6 left-0 right-0 z-10 flex flex-col items-center gap-1 text-xs tracking-widest text-white/60">
          مرّر للأسفل
          <ChevronDown size={18} className="animate-bounce" />
        </div>

        {/* lightweight loading bar (does not block first paint — poster shows immediately) */}
        {!ready && (
          <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 pb-5">
            <div className="h-1 w-40 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-lime transition-[width] duration-150" style={{ width: `${Math.round(loadPct * 100)}%` }} />
            </div>
            <span className="nums text-xs text-white/70">جارٍ التحميل {Math.round(loadPct * 100)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
