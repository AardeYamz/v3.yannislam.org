import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import type { Language } from 'src/app/services/language/language.service';

// The flag that stands for each language (US for English, China for Chinese), as inline SVG. Decorative: the text beside it names the language.
@Component({
  selector: 'app-flag',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (lang()) {
      @case ('en') {
        <svg class="flag" viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="20" fill="#fff"/><rect y="0.00" width="30" height="1.54" fill="#b22234"/><rect y="3.08" width="30" height="1.54" fill="#b22234"/><rect y="6.15" width="30" height="1.54" fill="#b22234"/><rect y="9.23" width="30" height="1.54" fill="#b22234"/><rect y="12.31" width="30" height="1.54" fill="#b22234"/><rect y="15.38" width="30" height="1.54" fill="#b22234"/><rect y="18.46" width="30" height="1.54" fill="#b22234"/><rect width="12" height="10.77" fill="#3c3b6e"/></svg>
      }
      @case ('zh') {
        <svg class="flag" viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="20" fill="#de2910"/><polygon fill="#ffde00" points="5,2 6.18,5.62 10,5.62 6.91,7.88 8.09,11.5 5,9.26 1.91,11.5 3.09,7.88 0,5.62 3.82,5.62" transform="translate(1.5 0) scale(.9)"/><g fill="#ffde00"><polygon points="10,1.5 10.4,2.7 11.7,2.7 10.7,3.4 11,4.6 10,3.9 9,4.6 9.3,3.4 8.3,2.7 9.6,2.7" transform="rotate(20 10 3)"/><polygon points="12,4 12.4,5.2 13.7,5.2 12.7,5.9 13,7.1 12,6.4 11,7.1 11.3,5.9 10.3,5.2 11.6,5.2" transform="rotate(45 12 5.5)"/><polygon points="12,8 12.4,9.2 13.7,9.2 12.7,9.9 13,11.1 12,10.4 11,11.1 11.3,9.9 10.3,9.2 11.6,9.2" transform="rotate(10 12 9.5)"/><polygon points="10,10.5 10.4,11.7 11.7,11.7 10.7,12.4 11,13.6 10,12.9 9,13.6 9.3,12.4 8.3,11.7 9.6,11.7" transform="rotate(30 10 12)"/></g></svg>
      }
    }
  `,
  styles: `
    :host { display: inline-flex; }
    .flag {
      width: 28px;
      height: 19px;
      border-radius: 2px;
      box-shadow: 0 0 0 1px rgba(128, 128, 128, 0.4);
    }
  `,
})
export class FlagComponent {
  lang = input.required<Language>();
}
