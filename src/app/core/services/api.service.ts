import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Empleado } from '../models/empleado.model';
import { Destino } from '../models/destino.model';
import { Viaje, ViaticoGuardado } from '../models/viatico.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ============================================
  // EMPLEADOS
  // ============================================
  getEmpleado(cedula: string): Observable<Empleado> {
    return this.http.get<Empleado>(`${this.apiUrl}/empleados/${cedula}`);
  }

  // ============================================
  // DESTINOS
  // ============================================
  getDestinos(activos?: boolean): Observable<Destino[]> {
    let params = new HttpParams();
    if (activos !== undefined) {
      params = params.set('activos', activos.toString());
    }
    return this.http.get<Destino[]>(`${this.apiUrl}/destinos`, { params });
  }

  // ============================================
  // VIATICOS
  // ============================================
  guardarViaticosIndividual(viajes: Partial<Viaje>[]): Observable<ViaticoGuardado> {
    return this.http.post<ViaticoGuardado>(`${this.apiUrl}/viaticos/individual`, viajes);
  }

  guardarViaticosGrupal(viajes: Partial<Viaje>[]): Observable<ViaticoGuardado> {
    return this.http.post<ViaticoGuardado>(`${this.apiUrl}/viaticos/grupal`, viajes);
  }

  validarDisponibilidadFecha(cedula: string, fecha: Date): Observable<{ existe: boolean; mensaje: string }> {
    const params = new HttpParams()
      .set('cedula', cedula)
      .set('fecha', fecha.toISOString().split('T')[0]);
    
    return this.http.get<{ existe: boolean; mensaje: string }>(`${this.apiUrl}/viaticos/validar-dia`, { params });
  }

  // ============================================
  // DOCUMENTOS
  // ============================================
  subirDocumento(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/documentos/upload`, formData);
  }
}