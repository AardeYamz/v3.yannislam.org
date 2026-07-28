import { animate, AnimationTriggerMetadata, query, stagger, style, transition, trigger } from '@angular/animations';

// Shared by header/banner/footer entrance animations: staggers each direct
// child in from `fromTransform` while fading in, then settles in place.
export function fadeStaggerAnimation(name: string, fromTransform: string): AnimationTriggerMetadata {
  return trigger(name, [
    transition(':enter', [
      query('*', [
        style({ opacity: 0, transform: fromTransform }),
        stagger(50, [
          animate('250ms cubic-bezier(0.35, 0, 0.25, 1)', style({ opacity: 1, transform: 'none' }))
        ])
      ])
    ])
  ]);
}
