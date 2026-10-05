/**
 * Runs before the app becomes interactive.
 *
 * Dev-only test hook: `?__raf=timer` drives animation frames from a timer, so Motion
 * animations still play in hidden or headless browsers used for automated visual checks.
 */
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && window.location.search.includes('__raf=timer')) {
  window.requestAnimationFrame = (cb) => window.setTimeout(() => cb(performance.now()), 16);
  window.cancelAnimationFrame = (id) => window.clearTimeout(id);
}

export {};
