import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { ProjectsComponent } from './components/home/projects/projects.component';
import { ProjectsHighschoolComponent } from './components/home/projects-highschool/projects-highschool.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'projects', component: ProjectsComponent },
  { path: 'projects/highschool', component: ProjectsHighschoolComponent },
  {
    path: 'aardeyamz',
    loadComponent: () => import('./components/other/aardeyamz/aardeyamz.component').then(m => m.AardeYamzComponent)
  },
  { path: '**', pathMatch: 'full', redirectTo: '/' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
