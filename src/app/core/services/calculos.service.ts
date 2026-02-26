import { Injectable } from '@angular/core';
import { CalculoDieta, CalculoDietaPorDia } from '../models/viatico.model';

@Injectable({
  providedIn: 'root'
})
export class CalculosService {
  
  // Constantes de porcentajes
  private readonly PORC_DESAYUNO = 0.10;
  private readonly PORC_ALMUERZO = 0.25;
  private readonly PORC_CENA = 0.20;
  private readonly PORC_ALOJAMIENTO = 0.45;
  private readonly INCREMENTO_TURISTICA = 1.05;

  constructor() { }

  /**
   * Parsea una fecha en formato ISO (YYYY-MM-DD) como fecha local,
   * evitando problemas de zona horaria UTC
   * 
   * @param dateString Fecha en formato YYYY-MM-DD o Date object
   * @returns Date object en zona horaria local
   */
  private parseDateLocal(dateString: string | Date): Date {
    if (dateString instanceof Date) {
      return new Date(dateString); // Ya es Date, solo copiar
    }
    
    // Parsear string YYYY-MM-DD
    const [year, month, day] = dateString.split('-').map(Number);
    // Usar constructor con números para crear fecha en zona local, no UTC
    return new Date(year, month - 1, day);
  }

  /**
   * Calcula los viáticos para un viaje, generando un array de días
   */
  calcularViaticosPorViaje(
    asignacionDiaria: number,
    fechaSalida: Date | string,
    horaSalida: string,
    fechaRetorno: Date | string,
    horaRetorno: string,
    nombreDestino: string,
    esTuristica: boolean,
    costoTransporte: number = 0
  ): CalculoDietaPorDia[] {
    
    const resultados: CalculoDietaPorDia[] = [];
    
    // Asegurarnos de que trabajamos con objetos Date correctos, parseando como zona local
    const salida = this.parseDateLocal(fechaSalida);
    const retorno = this.parseDateLocal(fechaRetorno);
    
    // Calcular diferencia en días
    const diffTime = retorno.getTime() - salida.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Mismo día
      const calculo = this.calcularDietaPorDia(
        asignacionDiaria,
        salida,
        retorno,
        horaSalida,
        horaRetorno,
        esTuristica,
        false
      );
      
      resultados.push({
        dia: salida,
        diaStr: this.formatearFecha(salida),
        horaSalida: horaSalida,
        horaRetorno: horaRetorno,
        destino: nombreDestino,
        esTuristica: esTuristica,
        transporte: costoTransporte,
        ...calculo,
        totalGastos: calculo.totalDieta + costoTransporte
      });
      
    } else {
      // Múltiples días
      for (let i = 0; i <= diffDays; i++) {
        const fechaActual = new Date(salida);
        fechaActual.setDate(salida.getDate() + i);
        
        let calculo: CalculoDieta;
        let horaSalidaStr = '';
        let horaRetornoStr = '';
        
        if (i === 0) {
          // Día de salida
          calculo = this.calcularDietaPorDia(
            asignacionDiaria,
            salida,
            retorno,
            horaSalida,
            '11:59 PM', // Hasta fin del día
            esTuristica,
            false
          );
          horaSalidaStr = horaSalida;
          horaRetornoStr = '11:59 PM';
          
        } else if (i === diffDays) {
          // Día de retorno
          calculo = this.calcularDietaPorDia(
            asignacionDiaria,
            salida,
            retorno,
            '12:00 AM',
            horaRetorno,
            esTuristica,
            false
          );
          horaSalidaStr = '12:00 AM';
          horaRetornoStr = horaRetorno;
          
        } else {
          // Día intermedio (100%)
          calculo = this.calcularDietaPorDia(
            asignacionDiaria,
            salida,
            retorno,
            '12:00 AM',
            '11:59 PM',
            esTuristica,
            true // Día intermedio
          );
          horaSalidaStr = '12:00 AM';
          horaRetornoStr = '11:59 PM';
        }
        
        resultados.push({
          dia: new Date(fechaActual),
          diaStr: this.formatearFecha(fechaActual),
          horaSalida: horaSalidaStr,
          horaRetorno: horaRetornoStr,
          destino: nombreDestino,
          esTuristica: esTuristica,
          transporte: i === 0 ? costoTransporte : 0, // Transporte solo el primer día
          ...calculo,
          totalGastos: calculo.totalDieta + (i === 0 ? costoTransporte : 0)
        });
      }
    }
    
    return resultados;
  }

  /**
   * Calcula la dieta para un día específico
   * ARTÍCULO SEXTO - Criterios de asignación de viáticos:
   * - DESAYUNO: Se cubre cuando personal sale de 6:00 AM a 10:00 AM
   * - ALMUERZO: Se cubre cuando está en viaje durante 11:00 AM - 1:00 PM (salida < 1 PM y retorno > 11 AM)
   * - CENA: Se cubre cuando regresa >= 6:00 PM
   */
  private calcularDietaPorDia(
    asignacionDiaria: number,
    fechaSalida: Date,
    fechaRetorno: Date,
    horaSalida: string,
    horaRetorno: string,
    esTuristica: boolean,
    esDiaIntermedio: boolean = false
  ): CalculoDieta {
    
    let desayuno = 0, almuerzo = 0, cena = 0, alojamiento = 0;
    
    if (esDiaIntermedio) {
      // Día completo: incluye todos los conceptos
      desayuno = asignacionDiaria * this.PORC_DESAYUNO;
      almuerzo = asignacionDiaria * this.PORC_ALMUERZO;
      cena = asignacionDiaria * this.PORC_CENA;
      alojamiento = asignacionDiaria * this.PORC_ALOJAMIENTO;
      
    } else {
      // Día parcial: aplicar normas del ARTÍCULO SEXTO ESTRICTAMENTE
      const horaSalidaNum = this.convertirHoraANumero(horaSalida);
      const horaRetornoNum = this.convertirHoraANumero(horaRetorno);
      
      // DESAYUNO: Hora de salida entre 6:00 AM (6.0) y 10:00 AM (10.0)
      // Esto significa: salida >= 6:00 AM Y salida <= 10:00 AM
      if (horaSalidaNum >= 6 && horaSalidaNum <= 10) {
        desayuno = asignacionDiaria * this.PORC_DESAYUNO;
      }
      
      // ALMUERZO: Personal debe estar en viaje DURANTE la hora de almuerzo (11 AM - 1 PM)
      // Condición: Salida ANTES de 1:00 PM (13.0) Y Retorno DESPUÉS de 11:00 AM (11.0)
      if (horaSalidaNum < 13 && horaRetornoNum > 11) {
        almuerzo = asignacionDiaria * this.PORC_ALMUERZO;
      }
      
      // CENA: Retorno >= 6:00 PM (18.0)
      if (horaRetornoNum >= 18) {
        cena = asignacionDiaria * this.PORC_CENA;
      }
      
      // ALOJAMIENTO: Se aplica si la fecha de retorno es diferente a la de salida
      // (es decir, si retorna después de las 12:00 AM del día siguiente)
      if (fechaRetorno > fechaSalida) {
        alojamiento = asignacionDiaria * this.PORC_ALOJAMIENTO;
      }
    }
    
    // Aplicar incremento por provincia turística
    if (esTuristica) {
      desayuno *= this.INCREMENTO_TURISTICA;
      almuerzo *= this.INCREMENTO_TURISTICA;
      cena *= this.INCREMENTO_TURISTICA;
      alojamiento *= this.INCREMENTO_TURISTICA;
    }
    
    const totalDieta = desayuno + almuerzo + cena + alojamiento;
    
    return { desayuno, almuerzo, cena, alojamiento, totalDieta };
  }

  /**
   * Convierte hora en formato "hh:mm AM/PM" a número decimal
   */
  convertirHoraANumero(hora: string): number {
    const [time, modifier] = hora.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    
    return hours + (minutes / 60);
  }

  /**
   * Valida si una comida aplica según las normas del ARTÍCULO SEXTO
   * @param tipoComida 'desayuno' | 'almuerzo' | 'cena'
   * @param horaSalida Hora de salida en formato "HH:mm AM/PM"
   * @param horaRetorno Hora de retorno en formato "HH:mm AM/PM"  
   * @returns true si la comida aplica, false en caso contrario
   */
  validarComidaSegunNormas(
    tipoComida: 'desayuno' | 'almuerzo' | 'cena',
    horaSalida: string,
    horaRetorno: string
  ): boolean {
    const horaSalidaNum = this.convertirHoraANumero(horaSalida);
    const horaRetornoNum = this.convertirHoraANumero(horaRetorno);
    
    switch (tipoComida) {
      case 'desayuno':
        // Se cubre cuando personal sale entre 6:00 AM y 10:00 AM
        return horaSalidaNum >= 6 && horaSalidaNum <= 10;
        
      case 'almuerzo':
        // Se cubre cuando sale >= 11:00 AM Y regresa >= 1:00 PM
        return horaSalidaNum >= 11 && horaRetornoNum >= 13;
        
      case 'cena':
        // Se cubre cuando regresa >= 6:00 PM
        return horaRetornoNum >= 18;
        
      default:
        return false;
    }
  }

  /**
   * Formatea una fecha a string DD/MM/YYYY
   */
  formatearFecha(fecha: Date): string {
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const anio = fecha.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }
}