import { Documento } from './documento.model';

export interface Viaje {
  id?: number;
  cedula: string;
  mes: number;
  anio: number;
  fechaSalida: Date;
  horaSalida: string; // Formato: "06:30 AM"
  fechaRetorno: Date;
  horaRetorno: string; // Formato: "05:30 PM"
  idDestino: number;
  nombreDestino?: string;
  esTuristica: boolean;
  documentos: Documento[];
  // Transporte
  esChofer: boolean;
  costoTransporte: number; // Manual, en RD$
  comprobantesTransporte: Documento[]; // Recibos, fotos peaje, etc.
  // Campos calculados (no se envían al backend)
  calculos?: CalculoDietaPorDia[];
}

export interface CalculoDieta {
  desayuno: number;
  almuerzo: number;
  cena: number;
  alojamiento: number;
  totalDieta: number;
}

export interface CalculoDietaPorDia extends CalculoDieta {
  dia: Date;
  diaStr: string;
  horaSalida: string;
  horaRetorno: string;
  destino: string;
  esTuristica: boolean;
  transporte: number;
  totalGastos: number;
}

export interface ViaticoGuardado {
  mensaje: string;
  ids: number[];
}