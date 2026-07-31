import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AosDirective } from 'src/app/directives/aos/aos.directive';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';
import { HomeModule } from '../home.module';

@Component({
    selector: 'app-projects-highschool',
    standalone: true,
    imports: [RouterModule, AosDirective, HomeModule],
    templateUrl: './projects-highschool.component.html',
    styleUrls: ['./projects-highschool.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectsHighschoolComponent {
  constructor(private configService: SiteConfigService) { }
  highschool: any = this.configService.projects.highschool;
}
