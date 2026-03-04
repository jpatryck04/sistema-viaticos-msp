/**
 * 🚀 CONFIGURACIÓN PRINCIPAL DE LA APLICACIÓN
 * 
 * Define los proveedores y servicios globales necesarios para la aplicación Angular.
 * Usa Standalone API (patrón moderno de Angular 14+).
 */

import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ModalModule } from 'ngx-bootstrap/modal';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { TimepickerModule } from 'ngx-bootstrap/timepicker';
import { provideToastr } from 'ngx-toastr';

import { routes } from './app.routes';

/**
 * 📋 Providers configurados:
 * - Router: Manejo de navegación y rutas lazy-loaded
 * - HttpClient: Comunicación con API REST
 * - Animaciones: Transiciones suaves de UI
 * - ngx-bootstrap: Componentes modales, datepicker, timepicker
 * - ngx-toastr: Notificaciones toast
 */
export const appConfig: ApplicationConfig = {
  providers: [
    // 🔀 Routing con lazy loading automático
    provideRouter(routes),
    
    // 🌐 HTTP Client para peticiones a API
    // ℹ️  Los interceptores pueden agregarse aquí si son necesarios
    provideHttpClient(),
    
    // 🎨 Módulos de UI y componentes de terceros
    importProvidersFrom(
      BrowserAnimationsModule,
      ModalModule.forRoot(),
      BsDatepickerModule.forRoot(),
      TimepickerModule.forRoot()
    ),
    
    // 🔔 Configuración de notificaciones toast
    provideToastr({
      positionClass: 'toast-top-right',
      timeOut: 5000,
      preventDuplicates: true,
      progressBar: true,
      progressAnimation: 'increasing'
    })
  ]
};
