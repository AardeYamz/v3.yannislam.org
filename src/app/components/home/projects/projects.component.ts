import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AosDirective } from 'src/app/directives/aos/aos.directive';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';

import { WorkHistoryComponent } from '../workhistory/workhistory.component';

@Component({
    selector: 'app-projects',
    standalone: true,
    imports: [RouterModule, AosDirective, WorkHistoryComponent],
    templateUrl: './projects.component.html',
    styleUrls: ['./projects.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectsComponent {
  private configService = inject(SiteConfigService);

  projects: any = this.configService.projects;
}

