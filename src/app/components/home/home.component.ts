import { Component, ChangeDetectionStrategy } from '@angular/core';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';
import { Experiences } from 'src/app/services/site-config/site-config.model';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class HomeComponent {
  constructor(private configService: SiteConfigService) { }
  experiences: Experiences = this.configService.experiences;
}
