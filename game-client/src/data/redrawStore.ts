type Listener = () => void;

let version = 0;
const listeners = new Set<Listener>();

export function getRedrawVersion(): number {
  return version;
}

export function subscribeRedraw(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function triggerRedraw(): void {
  version++;
  listeners.forEach((fn) => fn());
}
