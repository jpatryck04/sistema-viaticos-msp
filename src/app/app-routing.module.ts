import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/individual',
    pathMatch: 'full'
  },
  {
    path: 'individual',
    loadChildren: () => import('./modules/individual/individual.module').then(m => m.IndividualModule)
  },
  {
    path: 'grupal',
    loadChildren: () => import('./modules/grupal/grupal.module').then(m => m.GrupalModule)
  },
  {
    path: 'reportes',
    loadChildren: () => import('./modules/reportes/reportes.module').then(m => m.ReportesModule)
  },
  {
    path: '**',
    redirectTo: '/individual'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }