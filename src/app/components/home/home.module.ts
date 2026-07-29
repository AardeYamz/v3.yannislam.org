import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { CarouselModule } from 'ngx-owl-carousel-o';
import { NgxTypedJsModule } from 'ngx-typed-js';
import { AosDirective } from '../../directives/aos/aos.directive';
import { AboutComponent } from './about/about.component';
import { BannerComponent } from './banner/banner.component';
import { ContactComponent } from './contact/contact.component';
import { EducationComponent } from './education/education.component';
import { HomeComponent } from './home.component';
import { ProjectsComponent } from './projects/projects.component';
import { ProjectsHighschoolComponent } from './projects-highschool/projects-highschool.component';
import { WorkHistoryComponent } from "./workhistory/workhistory.component";
import { LinkifyPipe } from '../../pipes/linkify/linkify.pipe';


@NgModule({
  declarations: [
    HomeComponent,
    BannerComponent,
    AboutComponent,
    EducationComponent,
    ContactComponent,
    WorkHistoryComponent,
    ProjectsComponent,
    ProjectsHighschoolComponent,
    LinkifyPipe
  ],
  imports: [
    CommonModule,
    RouterModule,
    NgbNavModule,
    CarouselModule,
    NgxTypedJsModule,
    AosDirective
  ],
  exports: [ContactComponent]
})
export class HomeModule { }
