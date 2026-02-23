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
   * Calcula los viáticos para un viaje, generando un array de días
   */
  calcularViaticosPorViaje(
    asignacionDiaria: number,
    fechaSalida: Date,
    horaSalida: string,
    fechaRetorno: Date,
    horaRetorno: string,
    nombreDestino: string,
    esTuristica: boolean,
    costoTransporte: number = 0
  ): CalculoDietaPorDia[] {
    
    const resultados: CalculoDietaPorDia[] = [];
    
    // Asegurarnos de que trabajamos con objetos Date correctos
    const salida = new Date(fechaSalida);
    const retorno = new Date(fechaRetorno);
    
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
      // Día completo
      desayuno = asignacionDiaria * this.PORC_DESAYUNO;
      almuerzo = asignacionDiaria * this.PORC_ALMUERZO;
      cena = asignacionDiaria * this.PORC_CENA;
      alojamiento = asignacionDiaria * this.PORC_ALOJAMIENTO;
      
    } else {
      const horaSalidaNum = this.convertirHoraANumero(horaSalida);
      const horaRetornoNum = this.convertirHoraANumero(horaRetorno);
      
      // Desayuno (6:00 AM - 10:00 AM)
      if (horaSalidaNum >= 6 && horaSalidaNum <= 10) {
        desayuno = asignacionDiaria * this.PORC_DESAYUNO;
      }
      
      // Almuerzo (salida >= 11:00 AM y retorno >= 1:00 PM)
      if (horaSalidaNum >= 11 && horaRetornoNum >= 13) {
        almuerzo = asignacionDiaria * this.PORC_ALMUERZO;
      }
      
      // Cena (retorno >= 6:00 PM)
      if (horaRetornoNum >= 18) {
        cena = asignacionDiaria * this.PORC_CENA;
      }
      
      // Alojamiento (si retorna al día siguiente)
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
   * Formatea una fecha a string DD/MM/YYYY
   */
  formatearFecha(fecha: Date): string {
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const anio = fecha.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }
}