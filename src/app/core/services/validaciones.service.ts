import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class ValidacionesService {
  
  // Expresiones regulares
  private readonly CEDULA_REGEX = /^\d{3}-\d{7}-\d{1}$/;
  private readonly HORA_REGEX = /^(0[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;

  constructor(private apiService: ApiService) {}

  /**
   * Validador de formato de cédula dominicana
   */
  validadorCedula(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // No validar vacío
      }
      const valido = this.CEDULA_REGEX.test(control.value);
      return valido ? null : { formatoCedulaInvalido: true };
    };
  }

  /**
   * Valida que la fecha de retorno sea >= fecha de salida
   */
  validadorFechas(salidaControl: AbstractControl, retornoControl: AbstractControl): ValidatorFn {
    return (): ValidationErrors | null => {
      const salida = salidaControl.value;
      const retorno = retornoControl.value;
      
      if (!salida || !retorno) {
        return null;
      }
      
      const fechaSalida = new Date(salida);
      const fechaRetorno = new Date(retorno);
      
      if (fechaRetorno < fechaSalida) {
        return { fechaRetornoMenor: true };
      }
      
      return null;
    };
  }

  /**
   * Valida que la hora de retorno sea > hora de salida si es el mismo día
   */
  validadorHorasMismoDia(
    fechaSalidaControl: AbstractControl,
    fechaRetornoControl: AbstractControl,
    horaSalidaControl: AbstractControl,
    horaRetornoControl: AbstractControl
  ): ValidatorFn {
    return (): ValidationErrors | null => {
      const fechaSalida = fechaSalidaControl?.value;
      const fechaRetorno = fechaRetornoControl?.value;
      const horaSalida = horaSalidaControl?.value;
      const horaRetorno = horaRetornoControl?.value;
      
      if (!fechaSalida || !fechaRetorno || !horaSalida || !horaRetorno) {
        return null;
      }
      
      const salida = new Date(fechaSalida);
      const retorno = new Date(fechaRetorno);
      
      // Si son el mismo día, comparar horas
      if (salida.toDateString() === retorno.toDateString()) {
        const horaSalidaNum = this.convertirHoraANumero(horaSalida);
        const horaRetornoNum = this.convertirHoraANumero(horaRetorno);
        
        if (horaRetornoNum <= horaSalidaNum) {
          return { horaRetornoMenor: true };
        }
      }
      
      return null;
    };
  }

  /**
   * Valida que el mes seleccionado no sea anterior al actual
   */
  validadorMesActual(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      
      const fechaSeleccionada = new Date(control.value);
      const ahora = new Date();
      
      // Comparar año y mes
      if (fechaSeleccionada.getFullYear() < ahora.getFullYear()) {
        return { mesAnterior: true };
      }
      
      if (fechaSeleccionada.getFullYear() === ahora.getFullYear() && 
          fechaSeleccionada.getMonth() < ahora.getMonth()) {
        return { mesAnterior: true };
      }
      
      return null;
    };
  }

  /**
   * Validador asíncrono para verificar si la cédula existe
   */
  validadorCedulaExiste() {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }
      
      return this.apiService.getEmpleado(control.value).pipe(
        map(() => null), // Si existe, no hay error
        catchError(() => of({ cedulaNoExiste: true }))
      );
    };
  }

  /**
   * Validador asíncrono para verificar disponibilidad de fecha
   */
  validadorFechaDisponible(cedula: string) {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value || !cedula) {
        return of(null);
      }
      
      return this.apiService.validarDisponibilidadFecha(cedula, control.value).pipe(
        map(response => response.existe ? { fechaNoDisponible: true } : null),
        catchError(() => of(null))
      );
    };
  }

  /**
   * Utilidad para convertir hora a número
   */
  private convertirHoraANumero(hora: string): number {
    const [time, modifier] = hora.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    
    return hours + (minutes / 60);
  }
}