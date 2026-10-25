import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { AosDirective } from '../../../directives/aos/aos.directive';

@Component({
    selector: 'app-contact',
    templateUrl: './contact.component.html',
    styleUrls: ['./contact.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [AosDirective]
})
export class ContactComponent {
  analyticsService = inject(AnalyticsService);
}
