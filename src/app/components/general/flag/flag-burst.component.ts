import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import type { Language } from 'src/app/services/language/language.service';
import { FlagComponent } from './flag.component';

// A flag that "bursts" when `count` changes (the header bumps it after each language
// change): it pops in with a little overshoot, a ring expands from it and eight sparks
// in `color` fly outward and fade. count 0 (first load) shows the flag without playing it.
@Component({
  selector: 'app-flag-burst',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FlagComponent],
  template: `
    <!-- Keyed on count, so every change re-creates the element and replays the animation. -->
    @for (n of [count()]; track n) {
      <span class="burst" [class.run]="n > 0" [style.--burst-color]="color()">
        <app-flag [lang]="lang()"></app-flag>
        @for (angle of angles; track angle) {
          <i class="spark" [style.--angle.deg]="angle"></i>
        }
      </span>
    }
  `,
  styles: `
    :host { display: inline-flex; }
    .burst { position: relative; display: inline-flex; }
    .burst.run { animation: flag-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1); }
    .burst.run::after {
      content: '';
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      border: 2px solid var(--burst-color);
      opacity: 0;
      animation: flag-ring 0.6s ease-out;
    }
    .spark {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 5px;
      height: 5px;
      margin: -2.5px 0 0 -2.5px;
      border-radius: 50%;
      background: var(--burst-color);
      opacity: 0;
      pointer-events: none;
    }
    .burst.run .spark { animation: flag-spark 0.6s ease-out forwards; }
    @keyframes flag-pop {
      0% { transform: scale(0.4) rotate(-12deg); }
      60% { transform: scale(1.25) rotate(4deg); }
      100% { transform: scale(1) rotate(0); }
    }
    @keyframes flag-ring {
      0% { transform: scale(0.6); opacity: 0.9; }
      100% { transform: scale(2.4); opacity: 0; }
    }
    @keyframes flag-spark {
      0% { transform: rotate(var(--angle)) translateY(0) scale(1); opacity: 1; }
      100% { transform: rotate(var(--angle)) translateY(-26px) scale(0); opacity: 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .burst.run, .burst.run::after, .burst.run .spark { animation: none; }
    }
  `,
})
export class FlagBurstComponent {
  lang = input.required<Language>();
  count = input(0);
  color = input('#ffffff');
  readonly angles = [0, 45, 90, 135, 180, 225, 270, 315];
}
