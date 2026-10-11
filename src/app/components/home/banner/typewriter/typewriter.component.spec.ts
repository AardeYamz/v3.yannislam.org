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
    jasmine.clock().uninstall();
  });

  it('starts typing the first string from empty, like typed.js did', () => {
    jasmine.clock().install();
    create('browser');
    fixture.componentRef.setInput('strings', ['Developer', 'Designer']);
    fixture.detectChanges();

    expect(component.text()).toBe('');

    jasmine.clock().tick(60);

    expect(component.text()).toBe('D');
  });

  it('types and erases each string in turn, looping back to the first', () => {
    jasmine.clock().install();
    create('browser');
    fixture.componentRef.setInput('strings', ['Ab', 'Cd']);
    fixture.detectChanges();

    jasmine.clock().tick(60); // 'A'
    expect(component.text()).toBe('A');
    jasmine.clock().tick(60); // 'Ab'
    expect(component.text()).toBe('Ab');

    jasmine.clock().tick(1500); // pause, then start erasing
    jasmine.clock().tick(60); // 'A'
    expect(component.text()).toBe('A');
    jasmine.clock().tick(60); // ''
    expect(component.text()).toBe('');

    jasmine.clock().tick(300); // pause, then start typing the next string
    jasmine.clock().tick(60); // 'C'
    expect(component.text()).toBe('C');
  });

  it('never starts the animation loop during server-side rendering', () => {
    jasmine.clock().install();
    create('server');
    fixture.componentRef.setInput('strings', ['Developer', 'Designer']);
    fixture.detectChanges();

    jasmine.clock().tick(5000);

    expect(component.text()).toBe('Developer');
  });

  it('shows the first string statically when the user prefers reduced motion', () => {
    jasmine.clock().install();
    create('browser');
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    fixture.componentRef.setInput('strings', ['Developer', 'Designer']);
    fixture.detectChanges();

    jasmine.clock().tick(5000);

    expect(component.text()).toBe('Developer');
  });
});
