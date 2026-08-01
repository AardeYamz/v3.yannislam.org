import { ProjectsHighschoolComponent } from './projects-highschool.component';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';

describe('ProjectsHighschoolComponent', () => {
  let component: ProjectsHighschoolComponent;
  let configService: jasmine.SpyObj<SiteConfigService>;

  beforeEach(() => {
    configService = jasmine.createSpyObj('SiteConfigService', [], {
      projects: {
        highschool: [
          { title: 'High School Project 1', description: ['A learning project'], imgs: [], timeframe: '2019' }
        ]
      }
    });

    component = new ProjectsHighschoolComponent(configService);
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
});
