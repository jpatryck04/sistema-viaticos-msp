/**
 * ✈️ MODELOS DE VIÁTICOS
 * 
 * Estructuras de datos para gestionar desplazamientos y cálculo de gastos
 * de empleados del Ministerio de Salud Pública.
 */

import { Documento } from './documento.model';

/**
 * 📝 Interfaz principal de un viaje/viático
 */
export interface Viaje {
  /** Identificador único (asignado por el backend) */
  id?: number;
  
  /** Cédula del empleado */
  cedula: string;
  
  /** Mes del viaje (1-12) */
  mes: number;
  
  /** Año del viaje */
  anio: number;
  
  /** Fecha de salida */
  fechaSalida: Date;
  
  /** Hora de salida (formato: "06:30 AM") */
  horaSalida: string;
  
  /** Fecha de retorno */
  fechaRetorno: Date;
  
  /** Hora de retorno (formato: "05:30 PM") */
  horaRetorno: string;
  
  /** ID del destino */
  idDestino: number;
  
  /** Nombre del destino (opcional, para referencia) */
  nombreDestino?: string;
  
  /** Indica si el destino es turístico (afecta cálculo de dieta) */
  esTuristica: boolean;
  
  /** Documentos adjuntos (boletas, justificantes, etc.) */
  documentos: Documento[];
  
  /** Si el empleado era chofer en el viaje */
  esChofer: boolean;
  
  /** Costo del transporte ingresado manualmente (RD$) */
  costoTransporte: number;
  
  /** Comprobantes de transporte (recibos, fotos peaje, etc.) */
  comprobantesTransporte: Documento[];
  
  /** Cálculos diarios (no se envían al backend, solo uso local) */
  calculos?: CalculoDietaPorDia[];
}

/**
 * 💰 Desglose de dieta por concepto
 */
export interface CalculoDieta {
  /** Asignación para desayuno (RD$) */
  desayuno: number;
  
  /** Asignación para almuerzo (RD$) */
  almuerzo: number;
  
  /** Asignación para cena (RD$) */
  cena: number;
  
  /** Asignación para alojamiento (RD$) */
  alojamiento: number;
  
  /** Total de dieta calculado (RD$) */
  totalDieta: number;
}

/**
 * 📊 Cálculo de dieta y gastos por día del viaje
 */
export interface CalculoDietaPorDia extends CalculoDieta {
  /** Fecha del día calculado */
  dia: Date;
  
  /** Día en formato string */
  diaStr: string;
  
  /** Hora de salida en ese día */
  horaSalida: string;
  
  /** Hora de retorno en ese día */
  horaRetorno: string;
  
  /** Destino del viaje */
  destino: string;
  
  /** Si el destino es turístico */
  esTuristica: boolean;
  
  /** Gasto de transporte (RD$) */
  transporte: number;
  
  /** Total de gastos del día (RD$) */
  totalGastos: number;
}

/**
 * ✅ Respuesta del servidor al guardar viáticos
 */
export interface ViaticoGuardado {
  /** Mensaje de confirmación */
  mensaje: string;
  
  /** IDs de los viáticos guardados */
  ids: number[];
}
