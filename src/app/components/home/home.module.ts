import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { CarouselModule } from 'ngx-owl-carousel-o';
import { NgxTypedJsModule } from 'ngx-typed-js';
import { AboutComponent } from './about/about.component';
import { BannerComponent } from './banner/banner.component';
import { ContactComponent } from './contact/contact.component';
import { ExperienceComponent } from './experience/experience.component';
import { HomeComponent } from './home.component';


@NgModule({
  declarations: [
    HomeComponent,
    BannerComponent,
    AboutComponent,
    ExperienceComponent,
    ContactComponent,
  ],
  imports: [
    CommonModule,
    NgbNavModule,
    CarouselModule,
    NgxTypedJsModule
  ],
})
export class HomeModule { }