/**
 * 🚀 PUNTO DE ENTRADA DE LA APLICACIÓN
 * 
 * Bootstrap de la aplicación Angular usando Standalone API.
 * Se ejecuta antes de cualquier otro código.
 */

import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

// Iniciar la aplicación con la configuración definida en app.config.ts
bootstrapApplication(AppComponent, appConfig)
  .catch((err: any) => {
    console.error('❌ Error al iniciar la aplicación:', err);
  });
