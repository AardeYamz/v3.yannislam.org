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
        expect(Array.isArray(service.menu)).toBe(true);
        expect(service.menu.length).toBeGreaterThan(0);
        expect(service.menu.some((item: any) => item.navTitle === 'Projects')).toBe(true);
    });

    it('filters out hidden entries (the AardeYamz easter egg) from the rendered menu', () => {
        expect(service.menu.some((item: any) => item.navTitle === 'AardeYamz')).toBe(false);
        expect(service.data.siteMenu.some((item: any) => item.navTitle === 'AardeYamz' && item.hidden)).toBe(true);
    });

    it('exposes work/education/volunteering/skills under experiences', () => {
        expect(service.experiences.work?.list?.length).toBeGreaterThan(0);
        expect(service.experiences.volunteering?.list?.length).toBeGreaterThan(0);
        expect(Array.isArray(service.experiences.education)).toBe(true);
        expect(service.experiences.education.length).toBeGreaterThan(0);
        expect(Array.isArray(service.experiences.skills)).toBe(true);
    });

    it('exposes the contact list with a Github entry', () => {
        expect(Array.isArray(service.contacts)).toBe(true);
        expect(service.contacts.some((c: any) => c.name === 'Github')).toBe(true);
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
            expect(Array.isArray(entry.imgs), JSON.stringify(entry.title)).toBe(true);
            // imgs is only optional pre-resolveLogoKeys() in the type -- this
            // assertion is exactly what proves it's always populated by the time
            // a component reads it, hence the non-null assertion.
            expect(entry.imgs!.length, JSON.stringify(entry.title)).toBeGreaterThan(0);
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

    it('never mutates the imported config.json module (resolveLogoKeys is pure)', async () => {
        // A mutating implementation would have added imgs/image_alt directly
        // onto the objects inside the imported JSON module (service.data is
        // that same module, per the constructor). Importing it fresh here and
        // checking a logoKey-bearing entry still has no imgs/image_alt proves
        // resolveLogoKeys() returned new objects instead of writing onto it.
        const rawConfig = (await import('../../../assets/config.json')).default as any;
        const rawWorkEntry = rawConfig.about.experiences.work.list.find((e: any) => e.logoKey === 'voya');

        expect(rawWorkEntry.imgs).toBeUndefined();
        expect(rawWorkEntry.image_alt).toBeUndefined();
    });

    it('every entry referencing a logoKey resolves to a known logo', () => {
        const allEntries = [
            ...service.experiences.work.list,
            ...service.experiences.education,
            ...service.experiences.volunteering.list,
        ];

        for (const entry of allEntries) {
            if (entry.logoKey) {
                expect(service.logos[entry.logoKey], entry.logoKey).toBeTruthy();
                expect(entry.imgs, entry.logoKey).toEqual([service.logos[entry.logoKey].src]);
            }
        }
    });
});
