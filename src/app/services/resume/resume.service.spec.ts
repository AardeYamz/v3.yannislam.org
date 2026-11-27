import { RESUME_URL, ResumeService } from './resume.service';

describe('ResumeService', () => {
    let service: ResumeService;

    beforeEach(() => {
        service = new ResumeService('browser' as any);
    });

    describe('open()', () => {
        it('opens the published resume PDF', () => {
            vi.spyOn(window, 'open').mockReturnValue(null);

            service.open();

            expect(window.open).toHaveBeenCalledWith(RESUME_URL, '_blank', 'noopener');
        });

        it('does nothing during server-side rendering', () => {
            vi.spyOn(window, 'open').mockReturnValue(null);
            const serverService = new ResumeService('server' as any);

            serverService.open();

            expect(window.open).not.toHaveBeenCalled();
        });
    });
});
