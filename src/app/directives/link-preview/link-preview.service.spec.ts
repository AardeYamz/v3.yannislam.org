import { TestBed } from '@angular/core/testing';
import { LinkPreviewService } from './link-preview.service';

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
  });

  function card(): HTMLElement | null {
    return document.querySelector('.link-preview-card');
  }

  it('creates and populates the card on show', () => {
    service.show(host, { icon: 'fab fa-github', title: 'Github', url: 'https://github.com/AardeYamz' });

    const el = card();
    expect(el).toBeTruthy();
    expect(el?.classList.contains('link-preview-card--visible')).toBeTrue();
    expect(el?.querySelector('.link-preview-card__title')?.textContent).toBe('Github');
    expect(el?.querySelector('.link-preview-card__domain')?.textContent).toBe('github.com');
    expect(el?.querySelector('i')?.className).toBe('fab fa-github');
  });

  it('removes the visible class on hide, without removing the card from the DOM', () => {
    service.show(host, { icon: 'fab fa-github', title: 'Github', url: 'https://github.com/AardeYamz' });
    service.hide();

    expect(card()?.classList.contains('link-preview-card--visible')).toBeFalse();
    expect(card()).toBeTruthy();
  });

  it('does nothing for a non-http(s) URL (e.g. mailto:)', () => {
    service.show(host, { icon: 'fas fa-envelope', title: 'Email', url: 'mailto:test@example.com' });

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

  it('points the iframe at the target URL on show, alongside the fallback card', () => {
    service.show(host, { icon: 'fab fa-github', title: 'Github', url: 'https://github.com/AardeYamz' });

    expect(frame().src).toContain('github.com/AardeYamz');
  });

  it('upgrades to the live preview once the iframe load takes longer than the "instantly blocked" threshold', () => {
    spyOn(performance, 'now').and.returnValues(0, 900);
    service.show(host, { icon: 'fab fa-github', title: 'Github', url: 'https://github.com/AardeYamz' });

    frame().dispatchEvent(new Event('load'));

    expect(card()?.classList.contains('link-preview-card--iframe')).toBeTrue();
  });

  it('stays on the fallback card when the iframe "load" fires suspiciously fast (likely blocked framing)', () => {
    spyOn(performance, 'now').and.returnValues(0, 50);
    service.show(host, { icon: 'fab fa-github', title: 'Github', url: 'https://github.com/AardeYamz' });

    frame().dispatchEvent(new Event('load'));

    expect(card()?.classList.contains('link-preview-card--iframe')).toBeFalse();
  });

  it('resets to the fallback card at the start of every show(), before the new attempt resolves', () => {
    spyOn(performance, 'now').and.returnValues(0, 900);
    service.show(host, { icon: 'fab fa-github', title: 'Github', url: 'https://github.com/AardeYamz' });
    frame().dispatchEvent(new Event('load'));
    expect(card()?.classList.contains('link-preview-card--iframe')).toBeTrue();

    service.hide();
    service.show(host, { icon: 'fab fa-github', title: 'Github', url: 'https://github.com/AardeYamz' });

    expect(card()?.classList.contains('link-preview-card--iframe')).toBeFalse();
  });

  it('ignores a late iframe load result that arrives after hide() already abandoned the attempt', () => {
    spyOn(performance, 'now').and.returnValues(0, 900);
    service.show(host, { icon: 'fab fa-github', title: 'Github', url: 'https://github.com/AardeYamz' });
    const el = frame();

    service.hide();
    el.dispatchEvent(new Event('load'));

    expect(card()?.classList.contains('link-preview-card--iframe')).toBeFalse();
  });

  it('resets the iframe to about:blank on hide, to stop it loading in the background', () => {
    service.show(host, { icon: 'fab fa-github', title: 'Github', url: 'https://github.com/AardeYamz' });
    service.hide();

    expect(frame().src).toBe('about:blank');
  });
});
