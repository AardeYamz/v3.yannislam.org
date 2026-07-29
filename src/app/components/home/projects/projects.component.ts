import { Component, ChangeDetectionStrategy } from '@angular/core';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';

@Component({
    selector: 'app-projects',
    templateUrl: './projects.component.html',
    styleUrls: ['./projects.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class ProjectsComponent {
  constructor(private configService: SiteConfigService) { }
  projects: any = this.configService.projects;
}
