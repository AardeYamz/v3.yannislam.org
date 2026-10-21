import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AosDirective } from 'src/app/directives/aos/aos.directive';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';

import { WorkHistoryComponent } from '../workhistory/workhistory.component';
import { ProjectSection } from 'src/app/services/site-config/site-config.model';

@Component({
    selector: 'app-projects-highschool',
    standalone: true,
    imports: [RouterModule, AosDirective, WorkHistoryComponent],
    templateUrl: './projects-highschool.component.html',
    styleUrls: ['./projects-highschool.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectsHighschoolComponent {
  private configService = inject(SiteConfigService);

  highschool: ProjectSection = this.configService.projects.highschool;
}
