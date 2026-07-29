import { Injectable } from '@angular/core';

import resumeManifest from 'src/assets/resume-manifest.json';

@Injectable({
  providedIn: 'root'
})
export class ResumeService {

  open(): void {
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
