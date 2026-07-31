import { Component, ChangeDetectionStrategy } from '@angular/core';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class HomeComponent {
  constructor(private configService: SiteConfigService) { }
  experiences: any = this.configService.experiences;
}
