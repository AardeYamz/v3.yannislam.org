import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FadeStaggerDirective } from './fade-stagger.directive';

@Component({
  imports: [FadeStaggerDirective],
  template: `<div appFadeStagger="translateX(-20px)" appFadeStaggerSelector=".item"><i class="item"></i><i class="item"></i><b></b></div>`,
})
class HostComponent {}

describe('FadeStaggerDirective', () => {
  it('animates each matched element with a 50ms stagger', async () => {
    const calls: { delay: number }[] = [];
    spyOn(HTMLElement.prototype, 'animate').and.callFake(function (this: HTMLElement, _k: any, o: any) {
      calls.push({ delay: o.delay });
      return {} as Animation;
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(calls.map(c => c.delay)).toEqual([0, 50]);
  });
});
