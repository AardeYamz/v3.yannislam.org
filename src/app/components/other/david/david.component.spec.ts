import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DavidComponent } from './david.component';

describe('DavidComponent', () => {
  let fixture: ComponentFixture<DavidComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DavidComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(DavidComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders every configured image with alt text', () => {
    const imgs: HTMLImageElement[] = Array.from(fixture.nativeElement.querySelectorAll('img'));
    expect(imgs.length).toBe(fixture.componentInstance.david.images.length);
    imgs.forEach((img) => expect(img.alt).not.toBe(''));
  });
});
