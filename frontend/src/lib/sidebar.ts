export const SIDEBAR_MIN = 208;
export const SIDEBAR_MAX = 420;
export const SIDEBAR_DEFAULT = 256;
export const SIDEBAR_RAIL = 76;

export const WIDTH_KEY = 'sidebar:width';
export const COLLAPSED_KEY = 'sidebar:collapsed';

const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach((listener) => listener());
};

export const clampWidth = (value: number) =>
  Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(value)));

export const subscribeSidebar = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
};

export const readCollapsed = () => document.documentElement.dataset.sidebar === 'collapsed';

export const readWidth = () => {
  try {
    const stored = Number(localStorage.getItem(WIDTH_KEY));
    return Number.isFinite(stored) && stored > 0 ? clampWidth(stored) : SIDEBAR_DEFAULT;
  } catch {
    return SIDEBAR_DEFAULT;
  }
};

const paint = () => {
  const width = readCollapsed() ? SIDEBAR_RAIL : readWidth();
  document.documentElement.style.setProperty('--sidebar-w', `${width}px`);
};

export const setSidebarWidth = (value: number) => {
  const width = clampWidth(value);
  try {
    localStorage.setItem(WIDTH_KEY, String(width));
  } catch {
    paint();
  }
  paint();
  emit();
};

export const setSidebarCollapsed = (collapsed: boolean) => {
  document.documentElement.dataset.sidebar = collapsed ? 'collapsed' : 'expanded';
  try {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
  } catch {
    paint();
  }
  paint();
  emit();
};
