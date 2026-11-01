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
        pipe = TestBed.runInInjectionContext(() => new LinkifyPipe());
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
        expect(html.startsWith('check out ')).toBe(true);
        expect(html.endsWith(' for details')).toBe(true);
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

    // The pipe calls bypassSecurityTrustHtml, so it is the last line of defence
    // between config.json's prose and the DOM: an escaping gap here is an XSS
    // hole, not a cosmetic bug. Every assertion below is made against a parsed
    // DOM (what a browser would actually build, without executing it) rather
    // than against the generated string, so a payload that merely *looks*
    // neutralised in source form cannot pass.
    describe('adversarial input', () => {
        function parseBody(text: string): HTMLElement {
            // DOMParser documents are inert: no script runs, no image loads.
            return new DOMParser().parseFromString(render(text), 'text/html').body;
        }

        function singleAnchor(text: string): HTMLAnchorElement {
            const anchors = parseBody(text).querySelectorAll('a');
            expect(anchors.length, `expected exactly one anchor for: ${text}`).toBe(1);
            return anchors[0] as HTMLAnchorElement;
        }

        it('keeps a double quote in the URL inside the href instead of breaking out of it', () => {
            // Without escaping, this closes the href attribute and adds an event
            // handler to the generated <a>.
            const payload = 'https://a.example/"onmouseover="alert(1)';
            const body = parseBody(payload);
            const anchor = singleAnchor(payload);

            expect(anchor.getAttribute('href')).toBe('https://a.example/"onmouseover="alert(1');
            expect(anchor.getAttribute('onmouseover')).toBeNull();
            // Exactly the three attributes the pipe writes - href, target, rel.
            expect(anchor.attributes.length).toBe(3);
            // Nothing the payload contained became an element.
            expect(body.children.length).toBe(1);
            expect(anchor.textContent).toBe('https://a.example/"onmouseover="alert(1');
        });

        it('keeps a single quote in the URL inside the href instead of breaking out of it', () => {
            const payload = "https://a.example/'onclick='alert(1)";
            const anchor = singleAnchor(payload);

            expect(anchor.getAttribute('href')).toBe("https://a.example/'onclick='alert(1");
            expect(anchor.getAttribute('onclick')).toBeNull();
            expect(anchor.attributes.length).toBe(3);
            // Harmless while the attribute is double-quoted, which is why this case
            // asserts the escaping itself: it is what keeps the anchor safe if that
            // quoting convention ever changes to single quotes.
            expect(render(payload)).toContain('&#39;');
        });

        it('cannot close the generated anchor or open a script tag from inside the URL', () => {
            const payload = 'https://a.example/</a><script>alert(1)</script>';
            const body = parseBody(payload);

            expect(body.querySelectorAll('script').length).toBe(0);
            expect(body.children.length).toBe(1);
            // The URL match ends at the ")" in alert(1) (see URL_PATTERN), so the
            // anchor holds only the leading run - what matters is that "</a>" and
            // "<script>" arrive as text and the whole input survives as text.
            expect(singleAnchor(payload).textContent).toBe('https://a.example/</a><script>alert(1');
            expect(body.textContent).toBe(payload);
        });

        it('cannot add an event handler through text that follows the URL', () => {
            const payload = 'https://a.example/ onmouseover=alert(1)';
            const body = parseBody(payload);
            const anchor = singleAnchor(payload);

            expect(anchor.getAttribute('onmouseover')).toBeNull();
            expect(anchor.attributes.length).toBe(3);
            expect(body.children.length).toBe(1);
            expect(body.textContent).toBe(payload);
        });

        it('never turns a non-http(s) scheme into a link', () => {
            const payloads = [
                'javascript:alert(1)',
                'JavaScript:alert(document.domain)',
                'data:text/html,<script>alert(1)</script>',
                'vbscript:msgbox(1)',
                '//evil.example/',
            ];

            for (const payload of payloads) {
                const body = parseBody(payload);
                expect(body.querySelectorAll('a').length, payload).toBe(0);
                expect(body.querySelectorAll('script').length, payload).toBe(0);
                expect(body.textContent, payload).toBe(payload);
            }
        });

        it('leaves a dangerous scheme as text while still linkifying a real URL beside it', () => {
            const body = parseBody('javascript:alert(1) then https://ok.example/path');
            const anchors = body.querySelectorAll('a');

            expect(anchors.length).toBe(1);
            expect(anchors[0].getAttribute('href')).toBe('https://ok.example/path');
            expect(body.textContent).toContain('javascript:alert(1)');
        });

        it('escapes an ampersand exactly once, so the href still points at the original URL', () => {
            const payload = 'https://a.example/?a=1&b=2';
            const html = render(payload);

            // One `&amp;` on the wire. Double-escaping would emit `&amp;amp;`, which
            // the browser decodes to a literal "&amp;" in the URL - a silently
            // corrupted link rather than a security bug, but the same root cause.
            expect(html).toContain('href="https://a.example/?a=1&amp;b=2"');
            expect(html).not.toContain('&amp;amp;');
            expect(singleAnchor(payload).getAttribute('href')).toBe(payload);
        });

        it('decodes text that already looks like an entity exactly once', () => {
            // The href attribute round-trips to the input, proving escaping and
            // browser decoding are inverses - not two rounds of either.
            const payload = 'https://a.example/?q=a&amp;b';

            expect(singleAnchor(payload).getAttribute('href')).toBe(payload);
        });
    });
});
