import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { FooterComponent } from './footer/footer.component';
import { HeaderComponent } from './header/header.component';
import { LoadingScreenComponent } from './loading-screen/loading-screen.component';
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
    ReactiveFormsModule
  ],
  exports: [HeaderComponent, FooterComponent, LoadingScreenComponent]
})
export class GeneralModule { }
