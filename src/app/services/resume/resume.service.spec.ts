import resumeManifest from 'src/assets/resume-manifest.json';

import { ResumeService } from './resume.service';

describe('ResumeService', () => {
  let service: ResumeService;

  beforeEach(() => {
    service = new ResumeService();
  });

  describe('open()', () => {
    it('opens the manifest-resolved resume filename as an absolute, encoded URL', () => {
      spyOn(window, 'open');

      service.open();

      expect(window.open).toHaveBeenCalledWith(
        `${window.location.origin}/assets/resume/${encodeURIComponent(resumeManifest.filename as string)}`,
        '_blank'
      );
    });
  });
});
