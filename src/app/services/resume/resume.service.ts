import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';


/** Built and published to GitHub Pages by the yl-resume repo on every push to its main. */
export const RESUME_URL = 'https://aardeyamz.github.io/yl-resume/resume.pdf';

@Injectable({
  providedIn: 'root'
})
export class ResumeService {
  private readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  open(): void {
    // Only ever called from a click handler, so `window` always exists in
    // practice - this guard is just for consistency with the rest of the
    // codebase's SSR-safety pattern, in case that ever stops being true.
    if (!this.isBrowser) {
      return;
    }

    // A constant, not a runtime fetch, so this stays synchronous: window.open()
    // must run inside the click handler's call stack or browsers block it as a popup.
    window.open(RESUME_URL, "_blank", "noopener");
  }
}
