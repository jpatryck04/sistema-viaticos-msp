import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpResponse
} from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

/**
 * DEPRECATED: Este interceptor NO se está usando actualmente
 * 
 * IMPORTANTE: En producción, TODOS los datos deben venir del API remoto en localhost:3000
 * NO usar datos hardcodeados. Si necesitas datos para desarrollo local, configura
 * tu propio servidor mock en puerto 3000 y asegúrate de que esté corriendo.
 * 
 * Ver: src/environments/environment.ts para la configuración del API
 * 
 * @deprecated - No registrado en ningún módulo. Mantener solo como referencia histórica.
 */
@Injectable()
export class MockInterceptor implements HttpInterceptor {
  
  private mockDestinos = [
    { id: 1, nombre: 'Santo Domingo', pais: 'RD', esTuristica: false },
    { id: 2, nombre: 'Santiago', pais: 'RD', esTuristica: false },
    { id: 3, nombre: 'La Romana', pais: 'RD', esTuristica: true },
    { id: 4, nombre: 'Punta Cana', pais: 'RD', esTuristica: true },
    { id: 5, nombre: 'Puerto Plata', pais: 'RD', esTuristica: true },
    { id: 6, nombre: 'San Cristóbal', pais: 'RD', esTuristica: false },
    { id: 7, nombre: 'Nueva York', pais: 'USA', esTuristica: false },
    { id: 8, nombre: 'Washington', pais: 'USA', esTuristica: false },
  ];

  private mockEmpleados: { [key: string]: any } = {
    '402123456789': {
      cedula: '402123456789',
      nombre: 'Juan Perez',
      apellido: 'López',
      puesto: 'Médico',
      departamento: 'Salud Pública',
      salario: 35000,
      activo: true
    },
    '402987654321': {
      cedula: '402987654321',
      nombre: 'María García',
      apellido: 'Rodríguez',
      puesto: 'Enfermera',
      departamento: 'Atención al Paciente',
      salario: 28000,
      activo: true
    }
  };

  constructor() { }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    
    // GET /api/destinos
    if (request.method === 'GET' && request.url.includes('/destinos')) {
      return of(new HttpResponse({
        status: 200,
        body: this.mockDestinos
      })).pipe(delay(500));
    }

    // GET /api/empleados/{cedula}
    if (request.method === 'GET' && request.url.includes('/empleados/')) {
      const cedula = request.url.split('/empleados/')[1];
      const empleado = this.mockEmpleados[cedula];
      
      if (empleado) {
        return of(new HttpResponse({
          status: 200,
          body: empleado
        })).pipe(delay(500));
      } else {
        return throwError(() => ({
          status: 404,
          message: 'Empleado no encontrado'
        })).pipe(delay(500));
      }
    }

    // POST /api/viaticos/*
    if (request.method === 'POST' && request.url.includes('/viaticos')) {
      return of(new HttpResponse({
        status: 201,
        body: {
          exitoso: true,
          mensaje: 'Viáticos guardados correctamente',
          id: Math.random().toString(36).substr(2, 9)
        }
      })).pipe(delay(800));
    }

    // GET /api/viaticos/disponibilidad
    if (request.method === 'GET' && request.url.includes('/disponibilidad')) {
      return of(new HttpResponse({
        status: 200,
        body: {
          existe: false,
          mensaje: 'Disponible'
        }
      })).pipe(delay(300));
    }

    // Para cualquier otra solicitud, pasar al siguiente handler
    return next.handle(request);
  }
}
