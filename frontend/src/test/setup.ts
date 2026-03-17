import '@testing-library/jest-dom';
import { vi } from 'vitest';

// matchMedia mock (required by many UI libraries)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// ResizeObserver mock (required by @radix-ui/react-checkbox and other Radix components)
const MockResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
(globalThis as any).ResizeObserver = MockResizeObserver;
if (typeof window !== 'undefined') {
  (window as any).ResizeObserver = MockResizeObserver;
}

// IntersectionObserver mock (required by some Radix UI and animation libraries)
const MockIntersectionObserver = class IntersectionObserver {
  root = null;
  rootMargin = '';
  thresholds = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
} as unknown as typeof IntersectionObserver;
(globalThis as any).IntersectionObserver = MockIntersectionObserver;
if (typeof window !== 'undefined') {
  (window as any).IntersectionObserver = MockIntersectionObserver;
}

// URL.createObjectURL mock (used for PDF/file downloads)
if (typeof URL.createObjectURL === 'undefined') {
  Object.defineProperty(URL, 'createObjectURL', { value: vi.fn() });
}
if (typeof URL.revokeObjectURL === 'undefined') {
  Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn() });
}
