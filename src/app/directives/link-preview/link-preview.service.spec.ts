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
});
