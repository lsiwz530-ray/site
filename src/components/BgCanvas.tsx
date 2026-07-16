import { useEffect, useRef } from "react";

/**
 * Animated purple particle network background.
 * Ported from the reference index.html. Runs client-only.
 */
export function BgCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const mouse = { x: -9999, y: -9999, on: false };
    const R = 140;
    const F = 1.6;

    type P = {
      x: number; y: number; vx: number; vy: number;
      bx: number; by: number; r: number; a: number; w: boolean;
    };
    let ps: P[] = [];

    const resize = () => {
      c.width = window.innerWidth * dpr;
      c.height = window.innerHeight * dpr;
      c.style.width = window.innerWidth + "px";
      c.style.height = window.innerHeight + "px";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    const cnt = () => {
      const w = window.innerWidth;
      return w < 640 ? 45 : w < 1024 ? 75 : 110;
    };
    const makeP = (): P => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      bx: 0, by: 0,
      r: Math.random() * 1.7 + 0.6,
      a: Math.random() * 0.55 + 0.25,
      w: Math.random() > 0.82,
    });
    const init = () => {
      resize();
      ps = Array.from({ length: cnt() }, () => {
        const p = makeP();
        p.bx = p.vx; p.by = p.vy;
        return p;
      });
    };

    let raf = 0;
    const draw = () => {
      const w = window.innerWidth, h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(167,139,250,0.035)";
      ctx.lineWidth = 1;
      const gs = 56;
      for (let x = 0; x < w; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      ps.forEach((p) => {
        if (mouse.on) {
          const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
          if (d < R && d > 0) {
            const f = (1 - d / R) * F;
            p.vx += (dx / d) * f; p.vy += (dy / d) * f;
          }
        }
        p.vx = p.vx * 0.94 + p.bx * 0.06;
        p.vy = p.vy * 0.94 + p.by * 0.06;
        p.x += p.vx; p.y += p.vy;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        if (p.w) {
          ctx.fillStyle = `rgba(255,255,255,${p.a * 0.9})`;
          ctx.shadowBlur = 8; ctx.shadowColor = "rgba(255,255,255,.5)";
        } else {
          ctx.fillStyle = `rgba(167,139,250,${p.a})`;
          ctx.shadowBlur = 10; ctx.shadowColor = "rgba(139,92,246,.6)";
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      });
      for (let i = 0; i < ps.length; i++)
        for (let j = i + 1; j < ps.length; j++) {
          const a = ps[i], b = ps[j];
          const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
          if (d < 130) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(167,139,250,${0.16 * (1 - d / 130)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      raf = requestAnimationFrame(draw);
    };

    const onResize = () => { resize(); if (ps.length !== cnt()) init(); };
    const onMove = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true; };
    const onOut = () => { mouse.on = false; };
    const onTouch = (e: TouchEvent) => {
      if (e.touches[0]) { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; mouse.on = true; }
    };
    const onTouchEnd = () => { mouse.on = false; };

    init();
    draw();
    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseout", onOut);
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onOut);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return <canvas id="bgCanvas" ref={ref} />;
}
