import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IconComponent } from './icon.component';

describe('IconComponent', () => {
  let fixture: ComponentFixture<IconComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [IconComponent],
    });
    fixture = TestBed.createComponent(IconComponent);
  });

  it('renders an inline <svg> for a known icon name', () => {
    fixture.componentInstance.name = 'fa-sun';
    fixture.detectChanges();

    const svg = fixture.nativeElement.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('viewBox')).toBe('0 0 576 512');
  });

  it('switches glyph when the name input changes', () => {
    fixture.componentInstance.name = 'fa-sun';
    fixture.detectChanges();
    const sunViewBox = fixture.nativeElement.querySelector('svg').getAttribute('viewBox');

    fixture.componentInstance.name = 'fa-github';
    fixture.detectChanges();
    const githubViewBox = fixture.nativeElement.querySelector('svg').getAttribute('viewBox');

    expect(githubViewBox).not.toBe(sunViewBox);
  });

  it('renders nothing for an unknown icon name rather than throwing', () => {
    expect(() => {
      fixture.componentInstance.name = 'fa-not-a-real-icon';
      fixture.detectChanges();
    }).not.toThrow();

    expect(fixture.nativeElement.querySelector('svg')).toBeNull();
  });
});
