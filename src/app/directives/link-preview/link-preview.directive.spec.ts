import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LinkPreviewDirective } from './link-preview.directive';
import { LinkPreviewService } from './link-preview.service';

@Component({
  standalone: true,
  imports: [LinkPreviewDirective],
  template: `<a [appLinkPreview]="{ icon: 'fab fa-github', title: 'Github', url: 'https://github.com/AardeYamz' }">link</a>`,
})
class HostComponent { }

describe('LinkPreviewDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let previewService: jasmine.SpyObj<LinkPreviewService>;

  beforeEach(() => {
    previewService = jasmine.createSpyObj('LinkPreviewService', ['show', 'hide']);

    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: LinkPreviewService, useValue: previewService }],
    });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  function element(): HTMLElement {
    return fixture.nativeElement.querySelector('a');
  }

  it('shows the preview on mouseenter', () => {
    element().dispatchEvent(new Event('mouseenter'));

    expect(previewService.show).toHaveBeenCalledWith(
      element(),
      { icon: 'fab fa-github', title: 'Github', url: 'https://github.com/AardeYamz' }
    );
  });

  it('shows the preview on focus', () => {
    element().dispatchEvent(new Event('focus'));

    expect(previewService.show).toHaveBeenCalled();
  });

  it('hides the preview on mouseleave', () => {
    element().dispatchEvent(new Event('mouseleave'));

    expect(previewService.hide).toHaveBeenCalled();
  });

  it('hides the preview on blur', () => {
    element().dispatchEvent(new Event('blur'));

    expect(previewService.hide).toHaveBeenCalled();
  });
});
