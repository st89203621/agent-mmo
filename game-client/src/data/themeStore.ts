type Listener = () => void;

const STORAGE_KEY = 'mmo_trial_theme';

export interface ThemeOption {
  id: string;
  name: string;
}

export const THEMES: ThemeOption[] = [
  { id: '01', name: '樱花暮春' },
  { id: '02', name: '海棠胭脂' },
  { id: '03', name: '暮霞橘金' },
  { id: '04', name: '杏黄姜金' },
  { id: '05', name: '桃花春日' },
  { id: '06', name: '紫藤暮色' },
  { id: '07', name: '月白青瓷' },
  { id: '08', name: '鎏金檀木' },
  { id: '09', name: '烟花霓虹' },
  { id: '10', name: '青苔江南' },
  { id: '11', name: '蜜糖马卡龙' },
  { id: '12', name: '流光琉璃' },
];

let current: string = (() => {
  if (typeof window === 'undefined') return '01';
  return localStorage.getItem(STORAGE_KEY) || '01';
})();

const listeners = new Set<Listener>();

export function getTheme(): string {
  return current;
}

export function subscribeTheme(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function setTheme(id: string): void {
  if (id === current) return;
  current = id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* 隐私模式 / 配额满 · 忽略 */
  }
  listeners.forEach((fn) => fn());
}
