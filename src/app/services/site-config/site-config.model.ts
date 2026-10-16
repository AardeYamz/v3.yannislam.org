// Shape of src/assets/config.json. Kept in one file, next to the service
// that's the only thing allowed to import the JSON directly (see
// site-config.service.ts / CLAUDE.md's "Reading Config" section).
//
// config.json has no schema validation, and it shows: several fields are
// inconsistently present or inconsistently shaped across otherwise-similar
// entries (see the `link` field below in particular). These interfaces
// describe the data as it actually is, not as it "should" be — a field is
// only marked required if every entry in the current data really has it.

export interface MenuItem {
  navID?: number;
  // Every entry in the *rendered* nav (SiteConfigService.menu, which
  // filters out `hidden` entries) has one -- but the raw AardeYamz entry in
  // config.json's siteMenu doesn't, so it stays optional here to describe
  // data.siteMenu accurately too.
  navNumber?: string;
  navTitle: string;
  navContent: string;
  scrollSection: string;
  siteLocation: string;
  // AardeYamz is an easter-egg route: still reachable directly, filtered
  // out of the rendered nav by SiteConfigService.menu. See its comment.
  hidden?: boolean;
}

export interface Logo {
  src: string;
  alt: string;
}

export interface Contact {
  icon: string;
  name: string;
  url: string;
  handle?: string;
}

export interface AardeYamzCard {
  title: string;
  language: string;
  pronounciation: string;
  content: string[];
}

// Every entry that can carry a `logoKey` (work/education/volunteering) gets
// `imgs`/`image_alt` populated at runtime by SiteConfigService.resolveLogoKeys
// — they don't exist in config.json itself, so they're optional here and
// only guaranteed present after that resolution step has run.
export interface Experience {
  logoKey?: string;
  imgs?: string[];
  image_alt?: string;
  // Inconsistent in the source data itself: most entries store a single
  // external link as a one-element array, several store a bare string.
  // Typed as the union it actually is rather than "fixed" here — normalizing
  // config.json's content is a content edit, not this refactor's job.
  link?: string | string[];
  demoLink?: string;
  organization: string;
  title: string;
  subTitle?: string;
  timeframe: string;
  tab?: string;
  about?: string;
  description: string[];
  skills?: string[];
}

// WorkHistoryComponent is reused for both Experience entries (work/
// volunteering) and Project entries (college projects) -- see its own doc
// comment and home.component.html / projects.component.html. This is the
// shape it actually reads across both: the three fields every entry of
// either kind truly has, plus every field only one of them has, as
// optional. Both Experience and Project below already satisfy this
// structurally (TypeScript doesn't need an explicit `extends`).
export interface WorkHistoryEntry {
  title: string;
  timeframe: string;
  description: string[];
  imgs?: string[];
  image_alt?: string;
  organization?: string;
  subTitle?: string;
  about?: string;
  skills?: string[];
  link?: string | string[];
  demoLink?: string;
}

export interface ExperienceSection {
  sectionId: string;
  navNumber: string;
  headingText: string;
  list: Experience[];
}

export interface Experiences {
  work: ExperienceSection;
  education: Experience[];
  volunteering: ExperienceSection;
  skills: string[];
}

export interface AboutConfig {
  first: string;
  last: string;
  email: string;
  contact: Contact[];
  aardeyamz: AardeYamzCard[];
  experiences: Experiences;
}

export interface Banner {
  greeting: string;
  name: string;
  blurb: string[];
  typeSection: string[];
}

export interface FooterLink {
  url: string;
  text: string;
}

export interface DesignCredit {
  name: string;
  url: string;
  separator: string;
}

export interface FooterConfig {
  repo: FooterLink;
  builtWith: FooterLink & { linkText: string };
  designCredits: DesignCredit[];
}

export interface Project {
  imgs: string[];
  title: string;
  timeframe: string;
  description: string[];
  link?: string;
}

export interface ProjectSection {
  sectionId: string;
  navNumber: string;
  headingText: string;
  list: Project[];
}

export interface ProjectsConfig {
  sectionId: string;
  navNumber: string;
  headingText: string;
  college: ProjectSection;
  highschool: ProjectSection;
}

export interface SiteConfig {
  siteMenu: MenuItem[];
  logos: Record<string, Logo>;
  about: AboutConfig;
  banner: Banner;
  footer: FooterConfig;
  siteTitle: string;
  manifestName: string;
  manifestShortName: string;
  manifestStartUrl: string;
  manifestBackgroundColor: string;
  manifestThemeColor: string;
  manifestDisplay: string;
  manifestIcon: string;
  heading: string;
  subHeading: string;
  projects: ProjectsConfig;
}
