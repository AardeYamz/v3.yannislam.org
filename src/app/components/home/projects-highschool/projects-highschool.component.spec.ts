import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectsHighschoolComponent } from './projects-highschool.component';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';

describe('ProjectsHighschoolComponent', () => {
  let component: ProjectsHighschoolComponent;
  let fixture: ComponentFixture<ProjectsHighschoolComponent>;
  let configService: jasmine.SpyObj<SiteConfigService>;

  beforeEach(async () => {
    const configServiceSpy = jasmine.createSpyObj('SiteConfigService', [], {
      projects: { highschool: [] }
    });

    await TestBed.configureTestingModule({
      imports: [ProjectsHighschoolComponent],
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

  it('should handle empty highschool array', () => {
    component.highschool = [];
    expect(component.highschool.length).toBe(0);
  });

  it('should handle highschool array with items', () => {
    component.highschool = [
      { name: 'Project 1', description: 'Description 1' },
      { name: 'Project 2', description: 'Description 2' }
    ];
    expect(component.highschool.length).toBe(2);
  });
});
