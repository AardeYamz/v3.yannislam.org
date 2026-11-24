import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';

import { TypewriterComponent } from './typewriter.component';

describe('TypewriterComponent', () => {
    let fixture: ComponentFixture<TypewriterComponent>;
    let component: TypewriterComponent;

    function create(platformId: 'browser' | 'server'): void {
        TestBed.configureTestingModule({
            imports: [TypewriterComponent],
            providers: [{ provide: PLATFORM_ID, useValue: platformId }],
        });
        fixture = TestBed.createComponent(TypewriterComponent);
        component = fixture.componentInstance;
    }

    afterEach(() => {
        vi.useRealTimers();
    });

    it('starts typing the first string from empty, like typed.js did', () => {
        vi.useFakeTimers();
        create('browser');
        fixture.componentRef.setInput('strings', ['Developer', 'Designer']);
        fixture.detectChanges();

        expect(component.text()).toBe('');

        vi.advanceTimersByTime(60);

        expect(component.text()).toBe('D');
    });

    it('types and erases each string in turn, looping back to the first', () => {
        vi.useFakeTimers();
        create('browser');
        fixture.componentRef.setInput('strings', ['Ab', 'Cd']);
        fixture.detectChanges();

        vi.advanceTimersByTime(60); // 'A'
        expect(component.text()).toBe('A');
        vi.advanceTimersByTime(60); // 'Ab'
        expect(component.text()).toBe('Ab');

        vi.advanceTimersByTime(1500); // pause, then start erasing
        vi.advanceTimersByTime(60); // 'A'
        expect(component.text()).toBe('A');
        vi.advanceTimersByTime(60); // ''
        expect(component.text()).toBe('');

        vi.advanceTimersByTime(300); // pause, then start typing the next string
        vi.advanceTimersByTime(60); // 'C'
        expect(component.text()).toBe('C');
    });

    it('erases only back to the prefix the next string shares', () => {
        vi.useFakeTimers();
        create('browser');
        fixture.componentRef.setInput('strings', ['I am Ab', 'I am Cd']);
        fixture.detectChanges();

        vi.advanceTimersByTime(60 * 7 + 1500); // typed in full, pause over
        expect(component.text()).toBe('I am Ab');
        vi.advanceTimersByTime(60 * 2); // erased 'b', 'Ab'
        expect(component.text()).toBe('I am ');
        vi.advanceTimersByTime(60); // nothing more to erase
        expect(component.text()).toBe('I am ');
        vi.advanceTimersByTime(300 + 60 * 2); // pause, then types 'Cd' on the kept prefix
        expect(component.text()).toBe('I am Cd');
    });

    it('never starts the animation loop during server-side rendering', () => {
        vi.useFakeTimers();
        create('server');
        fixture.componentRef.setInput('strings', ['Developer', 'Designer']);
        fixture.detectChanges();

        vi.advanceTimersByTime(5000);

        expect(component.text()).toBe('Developer');
    });

    it('shows the first string statically when the user prefers reduced motion', () => {
        vi.useFakeTimers();
        create('browser');
        vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
        fixture.componentRef.setInput('strings', ['Developer', 'Designer']);
        fixture.detectChanges();

        vi.advanceTimersByTime(5000);

        expect(component.text()).toBe('Developer');
    });
});
