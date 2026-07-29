import { TestBed } from '@angular/core/testing';

import { SiteConfigService } from './site-config.service';

describe('SiteConfigService', () => {
  let service: SiteConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SiteConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('exposes the site nav menu, including the Projects entry', () => {
    expect(Array.isArray(service.menu)).toBeTrue();
    expect(service.menu.length).toBeGreaterThan(0);
    expect(service.menu.some((item: any) => item.navTitle === 'Projects')).toBeTrue();
  });

  it('exposes work/education/volunteering/skills under experiences', () => {
    expect(service.experiences.work?.list?.length).toBeGreaterThan(0);
    expect(service.experiences.volunteering?.list?.length).toBeGreaterThan(0);
    expect(Array.isArray(service.experiences.education)).toBeTrue();
    expect(service.experiences.education.length).toBeGreaterThan(0);
    expect(Array.isArray(service.experiences.skills)).toBeTrue();
  });

  it('exposes the contact list with a Github entry', () => {
    expect(Array.isArray(service.contacts)).toBeTrue();
    expect(service.contacts.some((c: any) => c.name === 'Github')).toBeTrue();
  });

  it('exposes projects with college and highschool sublists', () => {
    expect(service.projects.college?.list?.length).toBeGreaterThan(0);
    expect(service.projects.highschool?.list?.length).toBeGreaterThan(0);
  });

  it('every work/volunteering/project entry has at least one image, since WorkHistoryComponent renders exp.imgs[0] unconditionally', () => {
    const allEntries = [
      ...service.experiences.work.list,
      ...service.experiences.volunteering.list,
      ...service.projects.college.list,
      ...service.projects.highschool.list,
    ];

    for (const entry of allEntries) {
      expect(Array.isArray(entry.imgs)).withContext(JSON.stringify(entry.title)).toBeTrue();
      expect(entry.imgs.length).withContext(JSON.stringify(entry.title)).toBeGreaterThan(0);
    }
  });

  it('exposes the shared logos map keyed by logoKey', () => {
    expect(service.logos['voya']?.src).toContain('voya.com');
    expect(service.logos['voya']?.alt).toBeTruthy();
  });

  it('resolves entry.logoKey against the shared logos map into imgs/image_alt', () => {
    const voyaEntries = service.experiences.work.list.filter((e: any) => e.logoKey === 'voya');
    expect(voyaEntries.length).toBeGreaterThan(1);

    for (const entry of voyaEntries) {
      expect(entry.imgs).toEqual([service.logos['voya'].src]);
      expect(entry.image_alt).toBe(service.logos['voya'].alt);
    }
  });

  it('every entry referencing a logoKey resolves to a known logo', () => {
    const allEntries = [
      ...service.experiences.work.list,
      ...service.experiences.education,
      ...service.experiences.volunteering.list,
    ];

    for (const entry of allEntries) {
      if (entry.logoKey) {
        expect(service.logos[entry.logoKey]).withContext(entry.logoKey).toBeTruthy();
        expect(entry.imgs).withContext(entry.logoKey).toEqual([service.logos[entry.logoKey].src]);
      }
    }
  });
});
