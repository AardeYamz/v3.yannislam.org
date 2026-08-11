import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LinkPreviewDelegateDirective } from './link-preview-delegate.directive';
import { LinkPreviewService } from './link-preview.service';

@Component({
  standalone: true,
  imports: [LinkPreviewDelegateDirective],
  template: `
    <div appLinkPreviewDelegate>
      <p>Text before <a href="https://www.voya.com/">Voya Financial</a> text after.</p>
    </div>
  `,
})
class HostComponent { }

describe('LinkPreviewDelegateDirective', () => {
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

  function link(): HTMLElement {
    return fixture.nativeElement.querySelector('a');
  }

  function paragraph(): HTMLElement {
    return fixture.nativeElement.querySelector('p');
  }

  it('shows the preview when the mouse moves over a delegated link, resolving the icon from its domain', () => {
    link().dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

    expect(previewService.show).toHaveBeenCalledWith(
      link(),
      { icon: 'fas fa-up-right-from-square', title: 'Voya Financial', url: 'https://www.voya.com/' }
    );
  });

  it('shows the preview on focusin', () => {
    link().dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    expect(previewService.show).toHaveBeenCalled();
  });

  it('ignores mouseover on plain text outside any link', () => {
    paragraph().dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

    expect(previewService.show).not.toHaveBeenCalled();
  });

  it('hides the preview once the mouse leaves the link for an unrelated element', () => {
    link().dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: paragraph() }));

    expect(previewService.hide).toHaveBeenCalled();
  });

  it('hides the preview on focusout', () => {
    link().dispatchEvent(new FocusEvent('focusout', { bubbles: true }));

    expect(previewService.hide).toHaveBeenCalled();
  });
});
