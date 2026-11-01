import resumeManifest from 'src/assets/resume-manifest.json';

import { ResumeService } from './resume.service';

describe('ResumeService', () => {
    let service: ResumeService;

    beforeEach(() => {
        service = new ResumeService('browser' as any);
    });

    describe('open()', () => {
        it('opens the manifest-resolved resume filename as an absolute, encoded URL', () => {
            vi.spyOn(window, 'open').mockReturnValue(null);

            service.open();

            expect(window.open).toHaveBeenCalledWith(`${window.location.origin}/assets/resume/${encodeURIComponent(resumeManifest.filename as string)}`, '_blank');
        });

        it('does nothing during server-side rendering', () => {
            vi.spyOn(window, 'open').mockReturnValue(null);
            const serverService = new ResumeService('server' as any);

            serverService.open();

            expect(window.open).not.toHaveBeenCalled();
        });
    });
});
