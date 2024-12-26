import { Component, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import * as AOS from 'aos';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false
})
export class AppComponent implements OnInit {
  title = 'Portfolio';

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

    AOS.init();
  }
}
