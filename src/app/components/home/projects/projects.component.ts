import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AosDirective } from 'src/app/directives/aos/aos.directive';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';
import { ProjectsConfig } from 'src/app/services/site-config/site-config.model';
import { HomeModule } from '../home.module';

@Component({
    selector: 'app-projects',
    standalone: true,
    imports: [RouterModule, AosDirective, HomeModule],
    templateUrl: './projects.component.html',
    styleUrls: ['./projects.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectsComponent {
  constructor(private configService: SiteConfigService) { }
  projects: ProjectsConfig = this.configService.projects;
}

