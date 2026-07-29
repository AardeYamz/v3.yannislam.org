import { Component, ChangeDetectionStrategy } from '@angular/core';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';

@Component({
    selector: 'app-projects-highschool',
    templateUrl: './projects-highschool.component.html',
    styleUrls: ['./projects-highschool.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class ProjectsHighschoolComponent {
  constructor(private configService: SiteConfigService) { }
  highschool: any = this.configService.projects.highschool;
}
