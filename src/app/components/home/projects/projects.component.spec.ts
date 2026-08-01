import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { ProjectsComponent } from './projects.component';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';
import { HomeModule } from '../home.module';
import { AosDirective } from 'src/app/directives/aos/aos.directive';
import { LogoFallbackDirective } from 'src/app/directives/logo-fallback/logo-fallback.directive';

describe('ProjectsComponent', () => {
  let component: ProjectsComponent;
  let fixture: ComponentFixture<ProjectsComponent>;
  let configService: jasmine.SpyObj<SiteConfigService>;

  beforeEach(async () => {
    const configServiceSpy = jasmine.createSpyObj('SiteConfigService', [], {
      projects: {
        college: [
          { title: 'College Project 1', description: ['A great project'], imgs: [], timeframe: '2023' }
        ]
      }
    });

    await TestBed.configureTestingModule({
      imports: [ProjectsComponent, RouterTestingModule, HomeModule, AosDirective, LogoFallbackDirective],
      providers: [
        { provide: SiteConfigService, useValue: configServiceSpy }
      ]
    }).compileComponents();

    configService = TestBed.inject(SiteConfigService) as jasmine.SpyObj<SiteConfigService>;
    fixture = TestBed.createComponent(ProjectsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should get projects from configService', () => {
    expect(component.projects).toBe(configService.projects);
  });

  it('should have projects property defined', () => {
    expect(component.projects).toBeDefined();
  });

  it('should have college projects', () => {
    expect(component.projects.college).toBeDefined();
    expect(Array.isArray(component.projects.college)).toBe(true);
  });

  it('should handle projects array with items', () => {
    expect(component.projects.college.length).toBeGreaterThan(0);
    expect(component.projects.college[0].title).toBe('College Project 1');
  });

  it('should render without errors', () => {
    expect(() => {
      fixture.detectChanges();
    }).not.toThrow();
  });
});
