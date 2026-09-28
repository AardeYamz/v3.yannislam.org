import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import resumeManifest from 'src/assets/resume-manifest.json';

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

    // resume-manifest.json is (re)generated before every `ng serve`/`ng build`
    // (scripts/generate-resume-manifest.js) from whichever dated file in
    // src/assets/resume/ is newest, so the filename never has to be
    // hardcoded here. It's a static import (not a runtime fetch) so this
    // stays synchronous — window.open() must run inside the click handler's
    // call stack or browsers treat it as a popup and block it.
    const filename = resumeManifest.filename;
    if (!filename) {
      console.warn('[resume] Resume filename not resolved; skipping download.');
      return;
    }
    window.open(`${window.location.origin}/assets/resume/${encodeURIComponent(filename)}`, "_blank");
  }
}
