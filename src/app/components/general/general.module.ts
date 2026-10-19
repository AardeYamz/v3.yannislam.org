import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FooterComponent } from './footer/footer.component';
import { HeaderComponent } from './header/header.component';
import { LoadingScreenComponent } from './loading-screen/loading-screen.component';
import { LinkPreviewDirective } from '../../directives/link-preview/link-preview.directive';
import { IconComponent } from '../../icons/icon.component';
@NgModule({
  declarations: [
    HeaderComponent,
    FooterComponent,
    LoadingScreenComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    LinkPreviewDirective,
    IconComponent
  ],
  exports: [HeaderComponent, FooterComponent, LoadingScreenComponent]
})
export class GeneralModule { }
