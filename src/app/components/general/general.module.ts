import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { FooterComponent } from './footer/footer.component';
import { HeaderComponent } from './header/header.component';
import { LoadingScreenComponent } from './loading-screen/loading-screen.component';
import { LinkPreviewDirective } from '../../directives/link-preview/link-preview.directive';
@NgModule({
  declarations: [
    HeaderComponent,
    FooterComponent,
    LoadingScreenComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    NgbNavModule,
    FormsModule,
    ReactiveFormsModule,
    LinkPreviewDirective
  ],
  exports: [HeaderComponent, FooterComponent, LoadingScreenComponent]
})
export class GeneralModule { }
