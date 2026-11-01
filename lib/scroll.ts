// lib/scroll.ts — custom cubic ease-in-out smooth scrolling for the editor viewport.
// Provides 60fps programmatic scrolling with consistent cross-browser easing.

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function smoothScrollTo(
  container: HTMLElement,
  targetTop: number,
  duration = 550,
  onComplete?: () => void,
): () => void {
  const startTop = container.scrollTop;
  const distance = targetTop - startTop;

  if (Math.abs(distance) < 2) {
    container.scrollTop = targetTop;
    onComplete?.();
    return () => {};
  }

  const startTime = performance.now();
  let cancelled = false;
  let rafId: number;

  function step(now: number) {
    if (cancelled) return;
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = easeInOutCubic(progress);

    container.scrollTop = startTop + distance * ease;

    if (progress < 1) {
      rafId = requestAnimationFrame(step);
    } else {
      container.scrollTop = targetTop;
      onComplete?.();
    }
  }

  rafId = requestAnimationFrame(step);

  return () => {
    cancelled = true;
    cancelAnimationFrame(rafId);
  };
}

