import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkHistoryComponent } from './workhistory.component';

describe('WorkHistoryComponent', () => {
  let component: WorkHistoryComponent;
  let fixture: ComponentFixture<WorkHistoryComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [WorkHistoryComponent]
    });

    fixture = TestBed.createComponent(WorkHistoryComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('defaults its inputs to an empty, non-subsection state', () => {
    expect(component.experienceList()).toEqual([]);
    expect(component.sectionId()).toBe('');
    expect(component.navNumber()).toBe('');
    expect(component.headingText()).toBe('');
    expect(component.subsection()).toBeFalse();
  });

  it('reflects whatever is bound to experienceList/sectionId/navNumber/headingText/subsection', () => {
    const list = [{ title: 'Example Role', timeframe: '2024', description: ['Did things'] }];

    fixture.componentRef.setInput('experienceList', list);
    fixture.componentRef.setInput('sectionId', 'projects-college');
    fixture.componentRef.setInput('navNumber', '5.1.');
    fixture.componentRef.setInput('headingText', 'College Projects');
    fixture.componentRef.setInput('subsection', true);

    expect(component.experienceList()).toBe(list);
    expect(component.sectionId()).toBe('projects-college');
    expect(component.navNumber()).toBe('5.1.');
    expect(component.headingText()).toBe('College Projects');
    expect(component.subsection()).toBeTrue();
  });

  it('carousel options autoplay a single item at a time, looping', () => {
    expect(component.customOptions.items).toBe(1);
    expect(component.customOptions.loop).toBeTrue();
    expect(component.customOptions.autoplay).toBeTrue();
  });
});
