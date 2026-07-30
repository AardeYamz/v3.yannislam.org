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

  // Header is kept out of the DOM (see app.component.html's `@if`) until the
  // loading screen finishes: it mounts underneath that opaque, full-screen
  // overlay otherwise, so its :enter stagger animation plays out completely
  // hidden and is never actually seen.
  headerReady = false;

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

  onLoadingScreenFinished(): void {
    this.headerReady = true;
  }
}
