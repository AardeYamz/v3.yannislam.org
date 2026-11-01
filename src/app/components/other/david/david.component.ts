import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AosDirective } from 'src/app/directives/aos/aos.directive';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';

@Component({
  selector: 'app-david',
  imports: [AosDirective],
  templateUrl: './david.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './david.component.scss'
})
export class DavidComponent {
  private configService = inject(SiteConfigService);

  david = this.configService.data.about.david;
}
