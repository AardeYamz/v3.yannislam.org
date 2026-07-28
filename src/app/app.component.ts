import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class AppComponent implements OnInit {
  constructor(
    private titleService: Title,
    private metaService: Meta,
  ) { }

  ngOnInit(): void {
    this.titleService.setTitle("Yannis Lam");
    this.metaService.addTags([
      { name: 'keywords', content: 'Web, software, developer, portfolio, resume, photography' },
      { name: 'description', content: 'Yannis Lam Personal Website' },
    ]);
  }
}
