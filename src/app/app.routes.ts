import { Routes } from '@angular/router';

export const routes: Routes = [
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
