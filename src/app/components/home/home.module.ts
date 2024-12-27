import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { CarouselModule } from 'ngx-owl-carousel-o';
import { NgxTypedJsModule } from 'ngx-typed-js';
import { AboutComponent } from './about/about.component';
import { BannerComponent } from './banner/banner.component';
import { ContactComponent } from './contact/contact.component';
import { EducationComponent } from './education/education.component';
import { HomeComponent } from './home.component';
import { WorkHistoryComponent } from "./workhistory/workhistory.component";


@NgModule({
  declarations: [
    HomeComponent,
    BannerComponent,
    AboutComponent,
    EducationComponent,
    ContactComponent,
    WorkHistoryComponent
  ],
  imports: [
    CommonModule,
    NgbNavModule,
    CarouselModule,
    NgxTypedJsModule
  ],
  exports: [ContactComponent]
})
export class HomeModule { }
