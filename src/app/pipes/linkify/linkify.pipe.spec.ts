import { SecurityContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';

import { LinkifyPipe } from './linkify.pipe';

describe('LinkifyPipe', () => {
  let pipe: LinkifyPipe;
  let sanitizer: DomSanitizer;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    sanitizer = TestBed.inject(DomSanitizer);
    pipe = new LinkifyPipe(sanitizer);
  });

  function render(text: string): string {
    return sanitizer.sanitize(SecurityContext.HTML, pipe.transform(text)) ?? '';
  }

  it('creates', () => {
    expect(pipe).toBeTruthy();
  });

  it('leaves plain text with no URL untouched', () => {
    expect(render('just some plain text')).toBe('just some plain text');
  });

  it('wraps an embedded http(s) URL in a real anchor tag', () => {
    const html = render('check out https://www.dbtbt.com/ for details');

    expect(html).toContain('<a href="https://www.dbtbt.com/" target="_blank" rel="noopener">https://www.dbtbt.com/</a>');
    expect(html.startsWith('check out ')).toBeTrue();
    expect(html.endsWith(' for details')).toBeTrue();
  });

  it('linkifies more than one URL in the same string', () => {
    const html = render('https://a.example/ and https://b.example/');

    expect(html).toContain('<a href="https://a.example/" target="_blank" rel="noopener">https://a.example/</a>');
    expect(html).toContain('<a href="https://b.example/" target="_blank" rel="noopener">https://b.example/</a>');
  });

  it('escapes HTML-significant characters in the surrounding text so they cannot inject markup', () => {
    const html = render('<script>alert(1)</script> & more');

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp; more');
  });

  it('treats an empty/undefined input as an empty string rather than throwing', () => {
    expect(() => render(undefined as unknown as string)).not.toThrow();
    expect(render(undefined as unknown as string)).toBe('');
  });
});
