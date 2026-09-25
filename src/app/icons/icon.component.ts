import { ChangeDetectionStrategy, Component, Input, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { svgMarkup } from './icon-registry';

// Replaces `<i class="fa-solid fa-xxx">`/`<i class="fab fa-xxx">` icon
// glyphs with an inline SVG from icon-registry.ts. Sized off font-size and
// colored off `color` the same way the icon font was (1em box,
// fill="currentColor"), so no caller-side CSS needed to change beyond
// swapping the `i` selector for `app-icon` where one targeted the icon
// element directly.
@Component({
  selector: 'app-icon',
  standalone: true,
  template: '<span [innerHTML]="safeSvg()"></span>',
  styles: [`
    :host {
      display: inline-flex;
      width: 1em;
      height: 1em;
      vertical-align: -0.125em;
      line-height: 1;
    }
    span {
      display: contents;
    }
    ::ng-deep svg {
      width: 100%;
      height: 100%;
      display: block;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
  // A signal rather than a plain field: under OnPush, writing a plain field
  // from an @Input() setter only marks the view dirty when Angular's own
  // compiled template-binding instruction is what triggered the write (the
  // normal case for a real `[name]="..."` binding) -- a signal write marks
  // it dirty regardless of how `name` was set.
  readonly safeSvg = signal<SafeHtml>('');

  constructor(private readonly sanitizer: DomSanitizer) { }

  // The registry only ever holds this app's own hardcoded, developer-authored
  // SVG markup (never user input), so trusting it here is the same class of
  // safe bypass the Angular docs describe for known-static content.
  @Input() set name(value: string) {
    this.safeSvg.set(this.sanitizer.bypassSecurityTrustHtml(svgMarkup(value)));
  }
}
