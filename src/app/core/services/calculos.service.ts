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
  private readonly ASIGNACION_TECNICO = 4100;
  private readonly INCREMENTO_TURISTICA = 1.05;

  constructor() { }

  /**
   * Determina la asignación diaria según la tabla del MAP – Resolución 173-2025.
   *
   * Categorías (orden de evaluación: más específico primero):
   *  1. VICEMINISTROS                                       → 7,350
   *  2. MINISTROS                                           → 7,950
   *  3. SUB DIRECTORES GENERALES, NACIONALES Y EQUIV.       → 6,550
   *  4. DIRECTORES GENERALES, NACIONALES, EJECUTIVOS        → 6,950
   *  5. DIRECTORES DE AREAS                                 → 6,150
   *  6. ENCARGADOS DE DEPARTAMENTOS, DIVISIONES Y COORD.    → 5,750
   *  7. ENCARGADOS DE SECCIONES Y COORDINADORES             → 5,250
   *  8. PROFESIONALES                                       → 4,750
   *  9. TECNICOS                                            → 4,100
   * 10. OTROS PUESTOS (cualquier cargo no clasificado)      → 3,900
   */
  getAsignacionDiariaMAP(cargo: string): number {
    // Normalizar: mayúsculas, sin tildes/acentos, guiones → espacios, espacios múltiples → uno
    const c = cargo.toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // 1. VICEMINISTROS → 7,350  (siempre antes de MINISTROS)
    if (/\bVICE\s*MINISTR/.test(c) || /\bVICEMINISTR/.test(c)) return 7350;

    // 2. MINISTROS → 7,950
    if (/\bMINISTR/.test(c)) return 7950;

    // 3. SUB DIRECTORES GENERALES / NACIONALES / EQUIVALENTES → 6,550  (antes de DIRECTOR GENERAL)
    if (/\bSUB\s*DIRECTOR/.test(c) || /\bSUBDIRECTOR/.test(c)) return 6550;

    // 4. DIRECTORES GENERALES, NACIONALES, EJECUTIVOS Y EQUIVALENTES → 6,950
    if (/\bDIRECTOR[A]?\b/.test(c) &&
        (/\bGENERAL\b/.test(c) || /\bNACIONAL\b/.test(c) || /\bEJECUTIV/.test(c) || /\bEQUIVALENTE/.test(c))) return 6950;

    // 5. DIRECTORES DE AREAS (cualquier director no clasificado arriba) → 6,150
    if (/\bDIRECTOR[A]?\b/.test(c)) return 6150;

    // 6. ENCARGADOS DE DEPARTAMENTOS / DIVISIONES Y COORDINADORES → 5,750
    if (/\bENCARGAD[OA]\b/.test(c) &&
        (/\bDEPARTAMENTO\b/.test(c) || /\bDIVISION\b/.test(c))) return 5750;
    if (/\bCOORDINADOR[A]?\b/.test(c) &&
        (/\bDEPARTAMENTO\b/.test(c) || /\bDIVISION\b/.test(c))) return 5750;

    // 7. ENCARGADOS DE SECCIONES Y COORDINADORES → 5,250
    if (/\bENCARGAD[OA]\b/.test(c)) return 5250;
    if (/\bCOORDINADOR[A]?\b/.test(c)) return 5250;

    // 8. PROFESIONALES → 4,750
    if (/\bPROFESIONAL(ES)?\b/.test(c)) return 4750;

    // 9. TECNICOS → 4,100
    if (/\bTECNIC[OA](S)?\b/.test(c)) return 4100;

    // 10. OTROS PUESTOS → 3,900  (cualquier cargo que no coincida con ninguna categoría)
    return 3900;
  }

  private parseDateLocal(dateString: string | Date): Date {
    if (dateString instanceof Date) {
      return new Date(dateString);
    }
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private diffDays(a: Date, b: Date): number {
    const a0 = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
    const b0 = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
    return Math.round((b0 - a0) / (1000 * 60 * 60 * 24));
  }

  private enumerarDiasISO(desde: Date, hasta: Date): Date[] {
    const dias: Date[] = [];
    const actual = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate());
    const fin = new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate());
    while (actual.getTime() <= fin.getTime()) {
      dias.push(new Date(actual));
      actual.setDate(actual.getDate() + 1);
    }
    return dias;
  }

  private rangoTocaVentana(inicio: number, fin: number, wIni: number, wFin: number): boolean {
    return Math.max(inicio, wIni) <= Math.min(fin, wFin);
  }

  /**
   * Calcula los viáticos para un viaje, generando un array de días
   * Ventanas de tiempo para dieta (minutos desde 00:00)
   */
  private readonly DESAYUNO_INI = 6 * 60;
  private readonly DESAYUNO_FIN = 10 * 60;
  private readonly ALMUERZO_INI = 11 * 60;
  private readonly ALMUERZO_FIN = 13 * 60;
  private readonly CENA_MIN = 18 * 60;

  calcularViaticosPorViaje(
    asignacionDiaria: number,
    fechaSalida: Date | string,
    horaSalida: string,
    fechaRetorno: Date | string,
    horaRetorno: string,
    nombreDestino: string,
    esTuristica: boolean,
    costoTransporte: number = 0,
    esChofer: boolean = false,
    aplicarReglaExcepcionalChofer: boolean = false
  ): CalculoDietaPorDia[] {
    const resultados: CalculoDietaPorDia[] = [];

    const salida = this.parseDateLocal(fechaSalida);
    const retorno = this.parseDateLocal(fechaRetorno);

    const noches = this.diffDays(salida, retorno);
    const dias = this.enumerarDiasISO(salida, retorno);

    const salidaMin = this.convertirHoraANumero(horaSalida) * 60;
    const retornoMin = this.convertirHoraANumero(horaRetorno) * 60;

    for (let idx = 0; idx < dias.length; idx++) {
      const fecha = dias[idx];
      const esDiaSalida = idx === 0;
      const esDiaRetorno = idx === dias.length - 1;
      const esIntermedio = !esDiaSalida && !esDiaRetorno;

      let desayuno = 0;
      let almuerzo = 0;
      let cena = 0;
      let alojamiento = 0;
      const baseAlojamiento = (aplicarReglaExcepcionalChofer && esChofer)
        ? this.ASIGNACION_TECNICO
        : asignacionDiaria;

      if (esIntermedio) {
        desayuno = asignacionDiaria * this.PORC_DESAYUNO;
        almuerzo = asignacionDiaria * this.PORC_ALMUERZO;
        cena = asignacionDiaria * this.PORC_CENA;
        alojamiento = baseAlojamiento * this.PORC_ALOJAMIENTO;
      }

      if (esDiaSalida) {
        if (salidaMin >= this.DESAYUNO_INI && salidaMin <= this.DESAYUNO_FIN) {
          desayuno = asignacionDiaria * this.PORC_DESAYUNO;
        }

        const tocaAlmuerzo = (noches > 0)
          ? true
          : this.rangoTocaVentana(salidaMin, retornoMin, this.ALMUERZO_INI, this.ALMUERZO_FIN);

        if (tocaAlmuerzo) {
          almuerzo = asignacionDiaria * this.PORC_ALMUERZO;
        }

        const tocaCena = (noches > 0) ? true : retornoMin >= this.CENA_MIN;
        if (tocaCena) {
          cena = asignacionDiaria * this.PORC_CENA;
        }

        if (noches > 0) {
          alojamiento = baseAlojamiento * this.PORC_ALOJAMIENTO;
        }
      }

      if (esDiaRetorno && !esDiaSalida) {
        if (retornoMin >= this.DESAYUNO_INI) {
          desayuno = asignacionDiaria * this.PORC_DESAYUNO;
        }
        if (retornoMin >= this.ALMUERZO_INI) {
          almuerzo = asignacionDiaria * this.PORC_ALMUERZO;
        }
        if (retornoMin >= this.CENA_MIN) {
          cena = asignacionDiaria * this.PORC_CENA;
        }
      }

      if (esTuristica) {
        desayuno *= this.INCREMENTO_TURISTICA;
        almuerzo *= this.INCREMENTO_TURISTICA;
        cena *= this.INCREMENTO_TURISTICA;
        alojamiento *= this.INCREMENTO_TURISTICA;
      }

      const totalDieta = desayuno + almuerzo + cena + alojamiento;
      const transporte = esDiaSalida ? costoTransporte : 0;
      const totalGastos = totalDieta + transporte;

      resultados.push({
        dia: new Date(fecha),
        diaStr: this.formatearFecha(fecha),
        horaSalida: esDiaSalida ? horaSalida : '—',
        horaRetorno: esDiaRetorno ? horaRetorno : '—',
        destino: nombreDestino,
        esTuristica,
        desayuno,
        almuerzo,
        cena,
        alojamiento,
        totalDieta,
        transporte,
        totalGastos
      });
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

  formatearFecha(fecha: Date): string {
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const anio = fecha.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }
}
