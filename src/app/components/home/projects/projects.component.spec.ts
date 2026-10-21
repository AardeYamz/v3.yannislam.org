import { ProjectsComponent } from './projects.component';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';

describe('ProjectsComponent', () => {
  let component: ProjectsComponent;
  let configService: jasmine.SpyObj<SiteConfigService>;

  beforeEach(() => {
    configService = jasmine.createSpyObj('SiteConfigService', [], {
      projects: {
        sectionId: 'projects',
        navNumber: '05.',
        headingText: 'What have I built?',
        college: {
          sectionId: 'projects-college',
          navNumber: '5.1.',
          headingText: 'College Projects',
          list: [
            { title: 'College Project 1', description: ['A great project'], imgs: [], timeframe: '2023' }
          ]
        },
        highschool: {
          sectionId: 'projects-highschool',
          navNumber: '5.2.',
          headingText: 'High School Projects',
          list: []
        }
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

  it('should have a college projects list', () => {
    expect(component.projects.college).toBeDefined();
    expect(Array.isArray(component.projects.college.list)).toBe(true);
  });

  it('should handle projects list with items', () => {
    expect(component.projects.college.list.length).toBeGreaterThan(0);
    expect(component.projects.college.list[0].title).toBe('College Project 1');
  });
});
