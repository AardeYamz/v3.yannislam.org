import { Component, ChangeDetectionStrategy } from '@angular/core';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';
import { BannerComponent } from './banner/banner.component';
import { AboutComponent } from './about/about.component';
import { EducationComponent } from './education/education.component';
import { WorkHistoryComponent } from './workhistory/workhistory.component';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [BannerComponent, AboutComponent, EducationComponent, WorkHistoryComponent]
})
export class HomeComponent {
  constructor(private configService: SiteConfigService) { }
  experiences: any = this.configService.experiences;
}
