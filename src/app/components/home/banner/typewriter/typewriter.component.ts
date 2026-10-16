import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, PLATFORM_ID, inject, input, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const TYPE_SPEED_MS = 60;
const BACK_SPEED_MS = 60;
const PAUSE_AFTER_TYPE_MS = 1500;
const PAUSE_AFTER_ERASE_MS = 300;

type Phase = 'typing' | 'erasing';

// Signal-driven replacement for ngx-typed-js (a few dozen lines instead of a
// third-party dependency). typed.js calls getComputedStyle() and otherwise
// assumes a real browser, which throws under Domino during server-side
// prerendering - this component sidesteps that entirely by only ever
// starting the animation loop client-side, and shows the first string
// statically everywhere else (SSR, and prefers-reduced-motion).
@Component({
  selector: 'app-typewriter',
  standalone: true,
  template: `<h3 class="typing">{{ text() }}</h3>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TypewriterComponent implements OnInit {
  // Bound once by the parent from config.json and never reassigned
  // afterward, so a one-time read in ngOnInit (guaranteed to see the bound
  // value) is enough - no need for the async scheduling an effect() would
  // add, which would otherwise delay the very first paint of the static
  // fallback text by a tick.
  readonly strings = input<string[]>([]);

  readonly text = signal('');

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  ngOnInit(): void {
    const strings = this.strings();
    if (!strings.length) {
      return;
    }

    const prefersReducedMotion = this.isBrowser
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (this.isBrowser && !prefersReducedMotion) {
      // Types the first string out from empty, same as typed.js did.
      this.step(strings, 0, 0, 'typing');
    } else {
      // No animation runs during SSR (Domino has no getComputedStyle-backed
      // layout to type into) or when the visitor prefers reduced motion -
      // show the first string statically instead.
      this.text.set(strings[0]);
    }
  }

  private step(strings: string[], stringIndex: number, charIndex: number, phase: Phase): void {
    const full = strings[stringIndex];

    if (phase === 'typing') {
      this.text.set(full.slice(0, charIndex));
      this.timer = charIndex < full.length
        ? setTimeout(() => this.step(strings, stringIndex, charIndex + 1, 'typing'), TYPE_SPEED_MS)
        : setTimeout(() => this.step(strings, stringIndex, full.length, 'erasing'), PAUSE_AFTER_TYPE_MS);
      return;
    }

    this.text.set(full.slice(0, charIndex));
    if (charIndex > 0) {
      this.timer = setTimeout(() => this.step(strings, stringIndex, charIndex - 1, 'erasing'), BACK_SPEED_MS);
    } else {
      const nextIndex = (stringIndex + 1) % strings.length;
      this.timer = setTimeout(() => this.step(strings, nextIndex, 0, 'typing'), PAUSE_AFTER_ERASE_MS);
    }
  }
}
