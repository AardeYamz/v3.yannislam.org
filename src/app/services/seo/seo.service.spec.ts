import { TestBed } from '@angular/core/testing';
import { Meta } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';

import { SeoService } from './seo.service';

describe('SeoService', () => {
  let link: HTMLLinkElement;

  beforeEach(() => {
    link = document.createElement('link');
    link.rel = 'canonical';
    link.href = 'https://yannislam.org';
    document.head.appendChild(link);
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: '**', children: [] }])] });
  });

  afterEach(() => link.remove());

  it('maps router URLs to canonical URLs', () => {
    expect(SeoService.canonicalFor('/')).toBe('https://yannislam.org');
    expect(SeoService.canonicalFor('/projects')).toBe('https://yannislam.org/projects');
    expect(SeoService.canonicalFor('/projects/highschool?x=1#top')).toBe('https://yannislam.org/projects/highschool');
    expect(SeoService.canonicalFor('/aardeyamz/')).toBe('https://yannislam.org/aardeyamz');
  });

  it('updates the canonical, og:url and twitter:url on navigation', async () => {
    TestBed.inject(SeoService).init();
    await TestBed.inject(Router).navigateByUrl('/projects');

    expect(link.getAttribute('href')).toBe('https://yannislam.org/projects');
    const meta = TestBed.inject(Meta);
    expect(meta.getTag("property='og:url'")?.content).toBe('https://yannislam.org/projects');
    expect(meta.getTag("property='twitter:url'")?.content).toBe('https://yannislam.org/projects');
  });
});
