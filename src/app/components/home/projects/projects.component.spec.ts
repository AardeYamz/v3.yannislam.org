import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectsComponent } from './projects.component';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';

describe('ProjectsComponent', () => {
  let component: ProjectsComponent;
  let fixture: ComponentFixture<ProjectsComponent>;
  let configService: jasmine.SpyObj<SiteConfigService>;

  beforeEach(async () => {
    const configServiceSpy = jasmine.createSpyObj('SiteConfigService', [], {
      projects: []
    });

    await TestBed.configureTestingModule({
      imports: [ProjectsComponent],
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

  it('should handle empty projects array', () => {
    component.projects = [];
    expect(component.projects.length).toBe(0);
  });

  it('should handle projects array with items', () => {
    component.projects = [
      { name: 'Project 1', description: 'Description 1' },
      { name: 'Project 2', description: 'Description 2' }
    ];
    expect(component.projects.length).toBe(2);
  });
});
