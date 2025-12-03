/**
 * Smoothly scrolls the page over a specified duration
 * Creates a more human-like scrolling experience
 */
export function smoothScrollTo(
  targetY: number,
  duration: number = 2000,
  onComplete?: () => void
): () => void {
  const startY = window.scrollY;
  const difference = targetY - startY;
  const startTime = performance.now();
  let animationId: number;

  // Easing function for natural feel (ease-in-out)
  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  const animateScroll = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeInOutCubic(progress);

    window.scrollTo(0, startY + difference * easedProgress);

    if (progress < 1) {
      animationId = requestAnimationFrame(animateScroll);
    } else {
      onComplete?.();
    }
  };

  animationId = requestAnimationFrame(animateScroll);

  // Return cancel function
  return () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  };
}

/**
 * Scrolls through the entire page slowly, simulating human reading
 */
export function scrollThroughPage(
  duration: number = 5000,
  onComplete?: () => void
): () => void {
  const documentHeight = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight
  );
  const viewportHeight = window.innerHeight;
  const maxScroll = documentHeight - viewportHeight;

  return smoothScrollTo(maxScroll, duration, onComplete);
}

/**
 * Scrolls by a relative amount over a duration
 */
export function smoothScrollBy(
  deltaY: number,
  duration: number = 1000,
  onComplete?: () => void
): () => void {
  const targetY = Math.max(0, Math.min(
    window.scrollY + deltaY,
    document.documentElement.scrollHeight - window.innerHeight
  ));
  return smoothScrollTo(targetY, duration, onComplete);
}
