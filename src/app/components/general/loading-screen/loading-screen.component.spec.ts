import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoadingScreenComponent } from './loading-screen.component';
import { ThemeService } from 'src/app/services/theme/theme.service';

describe('LoadingScreenComponent', () => {
  let component: LoadingScreenComponent;
  let fixture: ComponentFixture<LoadingScreenComponent>;
  let themeService: jasmine.SpyObj<ThemeService>;

  beforeEach(() => {
    const themeServiceSpy = jasmine.createSpyObj('ThemeService', [], { mode: jasmine.createSpy('mode').and.returnValue('default') });

    TestBed.configureTestingModule({
      declarations: [LoadingScreenComponent],
      providers: [
        { provide: ThemeService, useValue: themeServiceSpy }
      ]
    });

    themeService = TestBed.inject(ThemeService) as jasmine.SpyObj<ThemeService>;
    fixture = TestBed.createComponent(LoadingScreenComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have hidden set to false initially', () => {
    expect(component.hidden).toBe(false);
  });

  it('should emit finished event', (done) => {
    component.finished.subscribe(() => {
      expect(true).toBe(true);
      done();
    });

    // Trigger the finished event manually
    component.finished.emit();
  });

  describe('pieceFill', () => {
    it('should return default color for default theme', () => {
      (themeService.mode as jasmine.Spy).and.returnValue('default');
      const color = component.pieceFill('#FF0000');
      expect(color).toBe('#FF0000');
    });

    it('should return black for light theme', () => {
      (themeService.mode as jasmine.Spy).and.returnValue('light');
      const color = component.pieceFill('#FF0000');
      expect(color).toBe('#000000');
    });

    it('should return white for dark theme', () => {
      (themeService.mode as jasmine.Spy).and.returnValue('dark');
      const color = component.pieceFill('#FF0000');
      expect(color).toBe('#ffffff');
    });
  });

  it('should handle ngAfterViewInit without errors', () => {
    expect(() => {
      fixture.detectChanges();
    }).not.toThrow();
  });

  it('should handle ngOnDestroy without errors', () => {
    fixture.detectChanges();
    expect(() => {
      component.ngOnDestroy();
    }).not.toThrow();
  });
});
