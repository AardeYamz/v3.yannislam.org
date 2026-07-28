import { Component, ChangeDetectionStrategy } from '@angular/core';
import * as jsonData from '../../../assets/config.json';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class HomeComponent {
  data: any = jsonData;
  experiences: any = this.data.about.experiences;
}
