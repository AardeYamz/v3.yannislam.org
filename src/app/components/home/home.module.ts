import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { CarouselModule } from 'ngx-owl-carousel-o';
import { NgxTypedJsModule } from 'ngx-typed-js';
import { AosDirective } from '../../directives/aos/aos.directive';
import { LogoFallbackDirective } from '../../directives/logo-fallback/logo-fallback.directive';
import { LogoFallbackBackgroundDirective } from '../../directives/logo-fallback/logo-fallback-background.directive';
import { AboutComponent } from './about/about.component';
import { BannerComponent } from './banner/banner.component';
import { ContactComponent } from './contact/contact.component';
import { EducationComponent } from './education/education.component';
import { FloatingLogosComponent } from './floating-logos/floating-logos.component';
import { HomeComponent } from './home.component';
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
    FloatingLogosComponent,
    LinkifyPipe
  ],
  imports: [
    CommonModule,
    RouterModule,
    NgbNavModule,
    CarouselModule,
    NgxTypedJsModule,
    AosDirective,
    LogoFallbackDirective,
    LogoFallbackBackgroundDirective
  ],
  // WorkHistoryComponent is exported (in addition to ContactComponent) so the
  // now-standalone, lazy-loaded ProjectsComponent/ProjectsHighschoolComponent
  // can still import HomeModule to use <app-workhistory> in their templates.
  exports: [ContactComponent, WorkHistoryComponent]
})
export class HomeModule { }
