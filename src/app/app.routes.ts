import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  {
    path: 'projects',
    loadComponent: () => import('./components/home/projects/projects.component').then(m => m.ProjectsComponent)
  },
  {
    path: 'projects/highschool',
    loadComponent: () => import('./components/home/projects-highschool/projects-highschool.component').then(m => m.ProjectsHighschoolComponent)
  },
  {
    path: 'aardeyamz',
    loadComponent: () => import('./components/other/aardeyamz/aardeyamz.component').then(m => m.AardeYamzComponent)
  },
  { path: '**', pathMatch: 'full', redirectTo: '/' },
];
