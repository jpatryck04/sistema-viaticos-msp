/**
 * 🌐 SERVICIO DE API
 * 
 * Centraliza todas las comunicaciones HTTP con el servidor backend.
 * Define los endpoints y sus tipos de datos esperados.
 * 
 * 📌 Endpoints disponibles:
 * - GET  /api/empleados/:cedula         → Obtener empleado por documento
 * - GET  /api/destinos                  → Listar todos los destinos
 * - POST /api/viaticos/individual       → Guardar viáticos individuales
 * - POST /api/viaticos/grupal           → Guardar viáticos en grupo
 * - GET  /api/viaticos/validar-dia      → Validar disponibilidad fecha
 * - POST /api/documentos/upload         → Subir archivos
 * - GET  /api/reportes                  → Obtener reportes (con filtros)
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Empleado } from '../models/empleado.model';
import { Destino } from '../models/destino.model';
import { Viaje, ViaticoGuardado } from '../models/viatico.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private reportesActualizados$ = new Subject<void>();

  /**
   * URL base de la API
   * Se obtiene de environment.ts (cambiar según ambiente)
   */
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ============================================
  // 👤 EMPLEADOS
  // ============================================
  
  /**
   * Obtiene los datos de un empleado por su número de cédula
   * @param cedula - Cédula única del empleado
   * @returns Observable<Empleado> - Datos completos del empleado
   */
  getEmpleado(cedula: string): Observable<Empleado> {
    return this.http.get<Empleado>(`${this.apiUrl}/empleados/${cedula}`);
  }

  // ============================================
  // 🌍 DESTINOS
  // ============================================
  
  /**
   * Obtiene la lista de destinos disponibles
   * @param activos - (Opcional) Filtrar solo destinos activos
   * @returns Observable<Destino[]> - Array de destinos
   */
  getDestinos(activos?: boolean): Observable<Destino[]> {
    let params = new HttpParams();
    if (activos !== undefined) {
      params = params.set('activos', activos.toString());
    }
    return this.http.get<Destino[]>(`${this.apiUrl}/destinos`, { params });
  }

  // ============================================
  // ✈️  VIÁTICOS
  // ============================================
  
  /**
   * Guarda los viáticos de un empleado individual
   */
  guardarViaticosIndividual(viajes: Partial<Viaje>[]): Observable<ViaticoGuardado> {
    return this.http.post<ViaticoGuardado>(
      `${this.apiUrl}/viaticos/individual`,
      viajes
    ).pipe(
      tap(() => this.emitirActualizacionReportes())
    );
  }

  /**
   * Guarda los viáticos de un grupo de empleados
   */
  guardarViaticosGrupal(viajes: Partial<Viaje>[]): Observable<ViaticoGuardado> {
    return this.http.post<ViaticoGuardado>(
      `${this.apiUrl}/viaticos/grupal`,
      viajes
    ).pipe(
      tap(() => this.emitirActualizacionReportes())
    );
  }

  /**
   * Valida si un empleado ya tiene viáticos registrados en una fecha
   * @param cedula - Cédula del empleado
   * @param fecha - Fecha a validar
   * @returns Observable - Response con validación
   */
  validarDisponibilidadFecha(cedula: string, fecha: Date): Observable<{ existe: boolean; mensaje: string }> {
    const params = new HttpParams()
      .set('cedula', cedula)
      .set('fecha', fecha.toISOString().split('T')[0]);
    
    return this.http.get<{ existe: boolean; mensaje: string }>(
      `${this.apiUrl}/viaticos/validar-dia`,
      { params }
    );
  }

  // ============================================
  // 📄 DOCUMENTOS
  // ============================================
  
  /**
   * Sube archivos de documentos (recibos, comprobantes, etc.)
   * @param formData - FormData con los archivos
   * @returns Observable - Response del servidor
   */
  subirDocumento(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/documentos/upload`, formData);
  }

  // ============================================
  // 📊 REPORTES
  // ============================================
  
  /**
   * Obtiene reportes de viáticos con filtros opcionales
   * @param filtros - Objeto con criterios de búsqueda
   * @returns Observable<any[]> - Array de reportes
   */
  getReportes(filtros?: {
    fechaInicio?: string;
    fechaFin?: string;
    cedula?: string;
    departamento?: string;
    estado?: string;
  }): Observable<any[]> {
    let params = new HttpParams();
    
    if (filtros) {
      if (filtros.fechaInicio) params = params.set('fechaInicio', filtros.fechaInicio);
      if (filtros.fechaFin) params = params.set('fechaFin', filtros.fechaFin);
      if (filtros.cedula) params = params.set('cedula', filtros.cedula);
      if (filtros.departamento) params = params.set('departamento', filtros.departamento);
      if (filtros.estado) params = params.set('estado', filtros.estado);
    }
    
    return this.http.get<any[]>(`${this.apiUrl}/reportes`, { params });
  }

  getReportesActualizados(): Observable<void> {
    return this.reportesActualizados$.asObservable();
  }

  private emitirActualizacionReportes(): void {
    this.reportesActualizados$.next();
  }
}