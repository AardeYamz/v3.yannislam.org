import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { IconComponent } from 'src/app/icons/icon.component';
import { WorkHistoryEntry } from 'src/app/services/site-config/site-config.model';
import { AosDirective } from '../../../directives/aos/aos.directive';
import { LogoFallbackDirective } from '../../../directives/logo-fallback/logo-fallback.directive';
import { LogoFallbackBackgroundDirective } from '../../../directives/logo-fallback/logo-fallback-background.directive';
import { LinkifyPipe } from '../../../pipes/linkify/linkify.pipe';

@Component({
    selector: 'app-workhistory',
    templateUrl: './workhistory.component.html',
    styleUrls: ['./workhistory.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [AosDirective, LogoFallbackDirective, LogoFallbackBackgroundDirective, LinkifyPipe, IconComponent]
})
export class WorkHistoryComponent {
  // Reused for both work/volunteering experience entries and college
  // project cards (see home.component.html / projects.component.html) --
  // genuinely either shape depending on which section renders it.
  experienceList = input<WorkHistoryEntry[]>([]);
  sectionId = input('');
  navNumber = input('');
  headingText = input('');
  subsection = input(false);

  // `link` is a bare string on some config.json entries and a one-element
  // array on others (see Experience.link in site-config.model.ts), so binding
  // it straight into [href] rendered "https://…," for the array half. The
  // template only ever shows the first link either way.
  linkHref(entry: WorkHistoryEntry): string | undefined {
    return Array.isArray(entry.link) ? entry.link[0] : entry.link;
  }
}
