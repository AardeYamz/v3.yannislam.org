import { Component, ChangeDetectionStrategy } from '@angular/core';
import { NamecardComponent } from "./namecard/namecard.component";

@Component({
  selector: 'app-aardeyamz',
  imports: [NamecardComponent],
  templateUrl: './aardeyamz.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './aardeyamz.component.scss'
})
export class AardeYamzComponent {

}
