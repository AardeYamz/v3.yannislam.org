import { WorkHistoryComponent } from './workhistory.component';

// Instantiated directly rather than through TestBed: WorkHistoryComponent is
// declared (not standalone) inside HomeModule, and its template depends on
// CarouselModule (ngx-owl-carousel-o) — pulling that in just to verify these
// plain @Input() bindings would test the carousel library, not this
// component's own logic.
describe('WorkHistoryComponent', () => {
  let component: WorkHistoryComponent;

  beforeEach(() => {
    component = new WorkHistoryComponent({} as any);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('defaults its inputs to an empty, non-subsection state', () => {
    expect(component.experienceList).toEqual([]);
    expect(component.sectionId).toBe('');
    expect(component.navNumber).toBe('');
    expect(component.headingText).toBe('');
    expect(component.subsection).toBeFalse();
  });

  it('reflects whatever is bound to experienceList/sectionId/navNumber/headingText/subsection', () => {
    const list = [{ title: 'Example Role' }];

    component.experienceList = list;
    component.sectionId = 'projects-college';
    component.navNumber = '5.1.';
    component.headingText = 'College Projects';
    component.subsection = true;

    expect(component.experienceList).toBe(list);
    expect(component.sectionId).toBe('projects-college');
    expect(component.navNumber).toBe('5.1.');
    expect(component.headingText).toBe('College Projects');
    expect(component.subsection).toBeTrue();
  });

  it('carousel options autoplay a single item at a time, looping', () => {
    expect(component.customOptions.items).toBe(1);
    expect(component.customOptions.loop).toBeTrue();
    expect(component.customOptions.autoplay).toBeTrue();
  });
});
