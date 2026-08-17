// ---------- Accessibility settings ----------
// The widget's state is stored in localStorage and applied as classes on <html> (+ a CSS
// variable for text size). A small init script in layout applies it before the first paint so
// there is no flash; the component uses applyA11y to update in real time.

export interface A11ySettings {
  fontLevel: number; // -2..+4, 0 = normal
  contrast: boolean;
  grayscale: boolean;
  underlineLinks: boolean;
  highlightLinks: boolean;
  spacing: boolean;
  bigCursor: boolean;
  noMotion: boolean;
}

export const A11Y_KEY = 'tiyul-plus:a11y';

export const FONT_MIN = -2;
export const FONT_MAX = 4;
export const FONT_STEP = 0.12;

export const defaultA11y: A11ySettings = {
  fontLevel: 0,
  contrast: false,
  grayscale: false,
  underlineLinks: false,
  highlightLinks: false,
  spacing: false,
  bigCursor: false,
  noMotion: false,
};

export function loadA11y(): A11ySettings {
  if (typeof window === 'undefined') return { ...defaultA11y };
  try {
    const raw = window.localStorage.getItem(A11Y_KEY);
    if (!raw) return { ...defaultA11y };
    return { ...defaultA11y, ...(JSON.parse(raw) as Partial<A11ySettings>) };
  } catch {
    return { ...defaultA11y };
  }
}

export function saveA11y(s: A11ySettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(A11Y_KEY, JSON.stringify(s));
  } catch {
    /* storage blocked - stays in memory */
  }
}

/** Applies the settings to the root element (classes + the text-size variable). */
export function applyA11y(s: A11ySettings): void {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  el.classList.toggle('a11y-contrast', s.contrast);
  el.classList.toggle('a11y-grayscale', s.grayscale);
  el.classList.toggle('a11y-underline-links', s.underlineLinks);
  el.classList.toggle('a11y-highlight-links', s.highlightLinks);
  el.classList.toggle('a11y-spacing', s.spacing);
  el.classList.toggle('a11y-cursor', s.bigCursor);
  el.classList.toggle('a11y-no-motion', s.noMotion);
  if (s.fontLevel) {
    el.style.setProperty('--a11y-font-scale', String(1 + s.fontLevel * FONT_STEP));
  } else {
    el.style.removeProperty('--a11y-font-scale');
  }
}
