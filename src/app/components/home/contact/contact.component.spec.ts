import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';

import { ContactComponent } from './contact.component';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { AosDirective } from 'src/app/directives/aos/aos.directive';

describe('ContactComponent', () => {
  let component: ContactComponent;
  let fixture: ComponentFixture<ContactComponent>;
  let analyticsService: jasmine.SpyObj<AnalyticsService>;

  beforeEach(() => {
    const analyticsServiceSpy = jasmine.createSpyObj('AnalyticsService', ['sendAnalyticEvent']);

    TestBed.configureTestingModule({
      declarations: [ContactComponent],
      imports: [CommonModule, AosDirective],
      providers: [
        { provide: AnalyticsService, useValue: analyticsServiceSpy }
      ]
    });

    analyticsService = TestBed.inject(AnalyticsService) as jasmine.SpyObj<AnalyticsService>;
    fixture = TestBed.createComponent(ContactComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have analytics service', () => {
    expect(component.analyticsService).toBeDefined();
  });

});
