import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { ProjectsHighschoolComponent } from './projects-highschool.component';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';
import { HomeModule } from '../home.module';
import { AosDirective } from 'src/app/directives/aos/aos.directive';
import { LogoFallbackDirective } from 'src/app/directives/logo-fallback/logo-fallback.directive';

describe('ProjectsHighschoolComponent', () => {
  let component: ProjectsHighschoolComponent;
  let fixture: ComponentFixture<ProjectsHighschoolComponent>;
  let configService: jasmine.SpyObj<SiteConfigService>;

  beforeEach(async () => {
    const configServiceSpy = jasmine.createSpyObj('SiteConfigService', [], {
      projects: {
        highschool: [
          { title: 'High School Project 1', description: ['A learning project'], imgs: [], timeframe: '2019' }
        ]
      }
    });

    await TestBed.configureTestingModule({
      imports: [ProjectsHighschoolComponent, RouterTestingModule, HomeModule, AosDirective, LogoFallbackDirective],
      providers: [
        { provide: SiteConfigService, useValue: configServiceSpy }
      ]
    }).compileComponents();

    configService = TestBed.inject(SiteConfigService) as jasmine.SpyObj<SiteConfigService>;
    fixture = TestBed.createComponent(ProjectsHighschoolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should get highschool projects from configService', () => {
    expect(component.highschool).toBe(configService.projects.highschool);
  });

  it('should have highschool property defined', () => {
    expect(component.highschool).toBeDefined();
  });

  it('should have highschool projects array', () => {
    expect(Array.isArray(component.highschool)).toBe(true);
  });

  it('should handle highschool array with items', () => {
    expect(component.highschool.length).toBeGreaterThan(0);
    expect(component.highschool[0].title).toBe('High School Project 1');
  });

  it('should render without errors', () => {
    expect(() => {
      fixture.detectChanges();
    }).not.toThrow();
  });
});
