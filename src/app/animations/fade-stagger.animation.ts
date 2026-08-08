import { animate, AnimationTriggerMetadata, query, stagger, style, transition, trigger } from '@angular/animations';

// Shared by header/banner/footer entrance animations: staggers each
// matched element in from `fromTransform` while fading in, then settles in
// place. `selector` defaults to '*' (every descendant, at any depth) which
// is fine for banner/footer's shallow markup, but the header passes a
// narrower one — see header.component.ts for why.
export function fadeStaggerAnimation(name: string, fromTransform: string, selector: string = '*'): AnimationTriggerMetadata {
  return trigger(name, [
    transition(':enter', [
      query(selector, [
        style({ opacity: 0, transform: fromTransform }),
        stagger(50, [
          animate('250ms cubic-bezier(0.35, 0, 0.25, 1)', style({ opacity: 1, transform: 'none' }))
        ])
      ])
    ])
  ]);
}
