/**
 * 🔀 RUTAS DE LA APLICACIÓN
 * 
 * Configuración de rutas principales con lazy loading automático.
 * Las rutas child se cargan bajo demanda para optimizar el bundle inicial.
 */

import { Routes } from '@angular/router';

export const routes: Routes = [
  // 🏠 Ruta raíz - redirige a módulo de viáticos individuales
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
  
  // 📊 Módulo de reportes
  {
    path: 'reportes',
    loadChildren: () => import('./modules/reportes/reportes.module').then(m => m.ReportesModule)
  },
  
  // ⚠️  Ruta wildcard - captura rutas no definidas
  {
    path: '**',
    redirectTo: '/individual'
  }
];
