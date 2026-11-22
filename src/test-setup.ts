import { afterEach, vi } from 'vitest';

// Jasmine restored every spy after each spec; Vitest does not, so a stubbed
// window.matchMedia or fake timers would leak into the next test.
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
