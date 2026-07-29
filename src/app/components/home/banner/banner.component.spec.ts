import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BannerComponent } from './banner.component';

describe('BannerComponent', () => {
  let component: BannerComponent;
  let fixture: ComponentFixture<BannerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BannerComponent]
    });
    fixture = TestBed.createComponent(BannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('openResume() logs an analytics event and opens the resume', () => {
    spyOn(component.analyticsService, 'sendAnalyticEvent');
    spyOn((component as any).resumeService, 'open');

    component.openResume();

    expect(component.analyticsService.sendAnalyticEvent)
      .toHaveBeenCalledWith('click_open_resume', 'banner', 'resume');
    expect((component as any).resumeService.open).toHaveBeenCalled();
  });
});
