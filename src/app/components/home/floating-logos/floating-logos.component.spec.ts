import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FALLBACK_HOST_BOX, FloatingLogosComponent, MODE_CONFIG, mosaicPlacement } from './floating-logos.component';
import { ThemeService } from 'src/app/services/theme/theme.service';
import { YL_SHAPE_BOUNDS, isInsideYlShape } from './yl-shape';

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

  it('should pick a mode that has a config', () => {
    expect(Object.keys(MODE_CONFIG)).toContain(component.mode);
    expect(component.config).toBe(MODE_CONFIG[component.mode]);
  });

  // Mode is decided once, in the constructor, from window.innerWidth (see
  // chooseMode()) - stub it before TestBed.createComponent() so the
  // component reads the stubbed value rather than this runner's actual
  // headless window size.
  it('should choose mosaic mode at desktop widths', () => {
    spyOnProperty(window, 'innerWidth', 'get').and.returnValue(1440);
    const desktopFixture = TestBed.createComponent(FloatingLogosComponent);
    expect(desktopFixture.componentInstance.mode).toBe('mosaic');
  });

  it('should choose falling mode at mobile widths', () => {
    spyOnProperty(window, 'innerWidth', 'get').and.returnValue(390);
    const mobileFixture = TestBed.createComponent(FloatingLogosComponent);
    expect(mobileFixture.componentInstance.mode).toBe('falling');
  });

  it('should treat the mosaic breakpoint as inclusive on its low end', () => {
    const innerWidthSpy = spyOnProperty(window, 'innerWidth', 'get');

    innerWidthSpy.and.returnValue(992);
    const atBreakpoint = TestBed.createComponent(FloatingLogosComponent);
    expect(atBreakpoint.componentInstance.mode).toBe('mosaic');

    innerWidthSpy.and.returnValue(991);
    const justBelow = TestBed.createComponent(FloatingLogosComponent);
    expect(justBelow.componentInstance.mode).toBe('falling');
  });

  it('should expose the mode as a host class', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.className).toBe(`mode-${component.mode}`);
  });

  it('should generate logos on initialization', () => {
    expect(component.logos.length).toBeGreaterThan(0);
  });

  it('should generate logos between the mode\'s min and max count', () => {
    expect(component.logos.length).toBeGreaterThanOrEqual(component.config.minCount);
    expect(component.logos.length).toBeLessThanOrEqual(component.config.maxCount);
  });

  it('should assign unique IDs to logos', () => {
    const ids = component.logos.map(logo => logo.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have valid size for each logo', () => {
    component.logos.forEach(logo => {
      expect(logo.size).toBeGreaterThanOrEqual(component.config.minSize);
      expect(logo.size).toBeLessThanOrEqual(component.config.maxSize);
    });
  });

  it('should assign variant to each logo', () => {
    component.logos.forEach(logo => {
      expect(logo.variant).toBeTruthy();
    });
  });

  it('should have valid rotation for each logo', () => {
    component.logos.forEach(logo => {
      expect(logo.rotation).toBeGreaterThanOrEqual(-component.config.maxRotationDeg);
      expect(logo.rotation).toBeLessThanOrEqual(component.config.maxRotationDeg);
    });
  });

  it('should have valid opacity for each logo', () => {
    component.logos.forEach(logo => {
      expect(logo.opacity).toBeGreaterThanOrEqual(component.config.minOpacity);
      expect(logo.opacity).toBeLessThanOrEqual(component.config.maxOpacity);
    });
  });

  it('should hide mosaic logos until they fade in, and show falling ones immediately', () => {
    component.logos.forEach(logo => {
      expect(logo.initialOpacity).toBe(component.mode === 'mosaic' ? 0 : logo.opacity);
    });
  });

  it('should call ngAfterViewInit without errors', () => {
    expect(() => {
      fixture.detectChanges();
    }).not.toThrow();
  });

  it('should render one image per logo', () => {
    fixture.detectChanges();
    const images: NodeListOf<HTMLImageElement> = fixture.nativeElement.querySelectorAll('img.floating-logo');
    expect(images.length).toBe(component.logos.length);
  });

  it('should position every logo once the animation loop has run a frame', async () => {
    fixture.detectChanges();
    // Transforms are written from the rAF loop, not from a binding, so give
    // it a frame to land before reading them back.
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    const images: NodeListOf<HTMLImageElement> = fixture.nativeElement.querySelectorAll('img.floating-logo');
    images.forEach(image => {
      expect(image.style.transform).toContain('translate3d');
    });
  });

  it('should anchor every logo on the YL mark when in mosaic mode', () => {
    if (component.mode !== 'mosaic') {
      pending('mosaic mode not selected for this run');
      return;
    }

    fixture.detectChanges();

    // Anchors are host pixels, so reverse the layout's mapping back into
    // shape units to confirm each logo really landed on the mark.
    const rect: DOMRect = fixture.nativeElement.getBoundingClientRect();
    const { scale, originX, originY } = mosaicPlacement(
      rect.width || FALLBACK_HOST_BOX.width,
      rect.height || FALLBACK_HOST_BOX.height
    );

    component.logos.forEach(logo => {
      const x = (logo.anchorX + logo.size / 2 - originX) / scale + YL_SHAPE_BOUNDS.minX;
      const y = (logo.anchorY + logo.size / 2 - originY) / scale + YL_SHAPE_BOUNDS.minY;
      expect(isInsideYlShape(x, y)).toBeTrue();
    });
  });
});
