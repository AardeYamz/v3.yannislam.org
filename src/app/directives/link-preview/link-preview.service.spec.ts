import { TestBed } from '@angular/core/testing';
import { LinkPreviewService } from './link-preview.service';

// A domain not covered by ICON_BY_DOMAIN/blocksFraming - the real iframe
// attempt tests need a target the service doesn't skip outright.
const UNBLOCKED_URL = 'https://www.voya.com/some/page';
const HOVER_INTENT_MS = 300;

describe('LinkPreviewService', () => {
    let service: LinkPreviewService;
    let host: HTMLElement;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(LinkPreviewService);

        host = document.createElement('a');
        host.style.position = 'fixed';
        host.style.top = '100px';
        host.style.left = '100px';
        document.body.appendChild(host);
    });

    afterEach(() => {
        host.remove();
        document.querySelectorAll('.link-preview-card').forEach(el => el.remove());
        vi.useRealTimers();
    });

    function card(): HTMLElement | null {
        return document.querySelector('.link-preview-card');
    }

    it('creates and populates the card on show', () => {
        service.show(host, { icon: 'fa-github', title: 'Github', url: 'https://github.com/AardeYamz' });

        const el = card();
        expect(el).toBeTruthy();
        expect(el?.classList.contains('link-preview-card--visible')).toBe(true);
        expect(el?.querySelector('.link-preview-card__title')?.textContent).toBe('Github');
        expect(el?.querySelector('.link-preview-card__domain')?.textContent).toBe('github.com');
        expect(el?.querySelector('i')?.querySelector('svg')).toBeTruthy();
    });

    it('removes the visible class on hide, without removing the card from the DOM', () => {
        service.show(host, { icon: 'fa-github', title: 'Github', url: 'https://github.com/AardeYamz' });
        service.hide();

        expect(card()?.classList.contains('link-preview-card--visible')).toBe(false);
        expect(card()).toBeTruthy();
    });

    it('does nothing for a non-http(s) URL (e.g. mailto:)', () => {
        service.show(host, { icon: 'fa-envelope', title: 'Email', url: 'mailto:test@example.com' });

        expect(card()).toBeFalsy();
    });

    it('does nothing for null/undefined data', () => {
        service.show(host, null);
        service.show(host, undefined);

        expect(card()).toBeFalsy();
    });

    function frame(): HTMLIFrameElement {
        return card()!.querySelector('iframe') as HTMLIFrameElement;
    }

    it('never starts an iframe attempt for a domain known to block framing, even after the hover-intent delay', () => {
        vi.useFakeTimers();
        service.show(host, { icon: 'fa-github', title: 'Github', url: 'https://github.com/AardeYamz' });
        vi.advanceTimersByTime(HOVER_INTENT_MS);

        expect(frame().src).toBe('about:blank');
    });

    it('does not point the iframe at the target until the hover-intent delay elapses', () => {
        vi.useFakeTimers();
        service.show(host, { icon: 'fa-up-right-from-square', title: 'Voya', url: UNBLOCKED_URL });

        expect(frame().src).toBe('about:blank');

        vi.advanceTimersByTime(HOVER_INTENT_MS);

        expect(frame().src).toContain('voya.com');
    });

    it('cancels the hover-intent timer if hide() is called before it elapses', () => {
        vi.useFakeTimers();
        service.show(host, { icon: 'fa-up-right-from-square', title: 'Voya', url: UNBLOCKED_URL });
        service.hide();
        vi.advanceTimersByTime(HOVER_INTENT_MS);

        expect(frame().src).toBe('about:blank');
    });

    it('upgrades to the live preview once the iframe load takes longer than the "instantly blocked" threshold', () => {
        vi.useFakeTimers();
        vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(900);
        service.show(host, { icon: 'fa-up-right-from-square', title: 'Voya', url: UNBLOCKED_URL });
        vi.advanceTimersByTime(HOVER_INTENT_MS);

        frame().dispatchEvent(new Event('load'));

        expect(card()?.classList.contains('link-preview-card--iframe')).toBe(true);
    });

    it('stays on the fallback card when the iframe "load" fires suspiciously fast (likely blocked framing)', () => {
        vi.useFakeTimers();
        vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(50);
        service.show(host, { icon: 'fa-up-right-from-square', title: 'Voya', url: UNBLOCKED_URL });
        vi.advanceTimersByTime(HOVER_INTENT_MS);

        frame().dispatchEvent(new Event('load'));

        expect(card()?.classList.contains('link-preview-card--iframe')).toBe(false);
    });

    it('resets to the fallback card at the start of every show(), before the new attempt resolves', () => {
        vi.useFakeTimers();
        vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(900);
        service.show(host, { icon: 'fa-up-right-from-square', title: 'Voya', url: UNBLOCKED_URL });
        vi.advanceTimersByTime(HOVER_INTENT_MS);
        frame().dispatchEvent(new Event('load'));
        expect(card()?.classList.contains('link-preview-card--iframe')).toBe(true);

        service.hide();
        service.show(host, { icon: 'fa-up-right-from-square', title: 'Voya', url: UNBLOCKED_URL });

        expect(card()?.classList.contains('link-preview-card--iframe')).toBe(false);
    });

    it('ignores a late iframe load result that arrives after hide() already abandoned the attempt', () => {
        vi.useFakeTimers();
        vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(900);
        service.show(host, { icon: 'fa-up-right-from-square', title: 'Voya', url: UNBLOCKED_URL });
        vi.advanceTimersByTime(HOVER_INTENT_MS);
        const el = frame();

        service.hide();
        el.dispatchEvent(new Event('load'));

        expect(card()?.classList.contains('link-preview-card--iframe')).toBe(false);
    });

    it('resets the iframe to about:blank on hide, to stop it loading in the background', () => {
        vi.useFakeTimers();
        service.show(host, { icon: 'fa-up-right-from-square', title: 'Voya', url: UNBLOCKED_URL });
        vi.advanceTimersByTime(HOVER_INTENT_MS);
        service.hide();

        expect(frame().src).toBe('about:blank');
    });
});
