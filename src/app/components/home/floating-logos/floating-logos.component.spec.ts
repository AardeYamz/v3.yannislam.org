import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FloatingLogosComponent } from './floating-logos.component';
import { ThemeService } from 'src/app/services/theme/theme.service';

describe('FloatingLogosComponent', () => {
  let component: FloatingLogosComponent;
  let fixture: ComponentFixture<FloatingLogosComponent>;
  let themeService: jasmine.SpyObj<ThemeService>;

  beforeEach(() => {
    const themeServiceSpy = jasmine.createSpyObj('ThemeService', [], { mode: jasmine.createSpy('mode').and.returnValue('default') });

    TestBed.configureTestingModule({
      declarations: [FloatingLogosComponent],
      providers: [
        { provide: ThemeService, useValue: themeServiceSpy }
      ]
    });

    themeService = TestBed.inject(ThemeService) as jasmine.SpyObj<ThemeService>;
    fixture = TestBed.createComponent(FloatingLogosComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should generate logos on initialization', () => {
    expect(component.logos.length).toBeGreaterThan(0);
  });

  it('should generate logos between min and max count', () => {
    expect(component.logos.length).toBeGreaterThanOrEqual(20);
    expect(component.logos.length).toBeLessThanOrEqual(40);
  });

  it('should assign unique IDs to logos', () => {
    const ids = component.logos.map(logo => logo.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have valid size for each logo', () => {
    component.logos.forEach(logo => {
      expect(logo.size).toBeGreaterThanOrEqual(22);
      expect(logo.size).toBeLessThanOrEqual(48);
    });
  });

  it('should assign variant to each logo', () => {
    component.logos.forEach(logo => {
      expect(logo.variant).toBeTruthy();
    });
  });

  it('should have valid rotation for each logo', () => {
    component.logos.forEach(logo => {
      expect(logo.rotation).toBeGreaterThanOrEqual(-25);
      expect(logo.rotation).toBeLessThanOrEqual(25);
    });
  });

  it('should have valid opacity for each logo', () => {
    component.logos.forEach(logo => {
      expect(logo.opacity).toBeGreaterThanOrEqual(0.16);
      expect(logo.opacity).toBeLessThanOrEqual(0.38);
    });
  });

  it('should call ngAfterViewInit without errors', () => {
    expect(() => {
      fixture.detectChanges();
    }).not.toThrow();
  });
});
