import type { Mock, MockedObject } from "vitest";
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoadingScreenComponent } from './loading-screen.component';
import { ThemeService } from 'src/app/services/theme/theme.service';

describe('LoadingScreenComponent', () => {
    let component: LoadingScreenComponent;
    let fixture: ComponentFixture<LoadingScreenComponent>;
    let themeService: MockedObject<ThemeService>;

    beforeEach(() => {
        const themeServiceSpy = {
            mode: vi.fn().mockName('mode').mockReturnValue('default')
        };

        TestBed.configureTestingModule({
            imports: [LoadingScreenComponent],
            providers: [
                { provide: ThemeService, useValue: themeServiceSpy }
            ]
        });

        themeService = TestBed.inject(ThemeService) as MockedObject<ThemeService>;
        fixture = TestBed.createComponent(LoadingScreenComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should have hidden set to false initially', () => {
        expect(component.hidden).toBe(false);
    });

    it('should emit finished event', async () => {
        component.finished.subscribe(() => {
            expect(true).toBe(true);
            ;
        });

        // Trigger the finished event manually
        component.finished.emit();
    });

    describe('pieceFill', () => {
        it('should return default color for default theme', () => {
            (themeService.mode as Mock).mockReturnValue('default');
            const color = component.pieceFill('#FF0000');
            expect(color).toBe('#FF0000');
        });

        it('should return black for light theme', () => {
            (themeService.mode as Mock).mockReturnValue('light');
            const color = component.pieceFill('#FF0000');
            expect(color).toBe('#000000');
        });

        it('should return white for dark theme', () => {
            (themeService.mode as Mock).mockReturnValue('dark');
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

    it('locks page scroll while shown and restores it once destroyed, even before the outro finishes', () => {
        fixture.detectChanges();

        expect(document.body.style.overflow).toBe('hidden');

        component.ngOnDestroy();

        expect(document.body.style.overflow).toBe('');
    });

    it('skips the intro/outro animation and hides quickly when the user prefers reduced motion', async () => {
        vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
        fixture.detectChanges();

        expect(component.hidden).toBe(false);

        // REDUCED_MOTION_DISPLAY_MS is a real (unmocked) setTimeout - this repo
        // doesn't use zone.js/fakeAsync (the app is zoneless), so a short real
        // wait is how the rest of this suite handles timer-driven async code too.
        await new Promise(resolve => setTimeout(resolve, 350));

        expect(component.hidden).toBe(true);
        expect(document.body.style.overflow).toBe('');
    });
});
