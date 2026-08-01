import { ProjectsComponent } from './projects.component';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';

describe('ProjectsComponent', () => {
  let component: ProjectsComponent;
  let configService: jasmine.SpyObj<SiteConfigService>;

  beforeEach(() => {
    configService = jasmine.createSpyObj('SiteConfigService', [], {
      projects: {
        college: [
          { title: 'College Project 1', description: ['A great project'], imgs: [], timeframe: '2023' }
        ]
      }
    });

    component = new ProjectsComponent(configService);
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
});
