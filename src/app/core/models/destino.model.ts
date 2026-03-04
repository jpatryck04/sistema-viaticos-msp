/**
 * 🌍 MODELO DE DESTINO
 * 
 * Interfaz que define los destinos disponibles para viajes.
 * Incluye propiedades para determinar si es turístico y cálculo de costos.
 */

export interface Destino {
  /** Identificador único del destino */
  id: number;
  
  /** Nombre del destino (ciudad, provincia) */
  nombre: string;
  
  /** Tipo de destino: turístico o normal */
  tipo: 'turistica' | 'normal';
  
  /** Costo aproximado de transporte al destino (RD$) */
  costoTransporte: number;
  
  /** Distancia en kilómetros desde capital */
  distanciaKm: number;
  
  /** Indica si el destino está disponible */
  activo: boolean;
}

/**
 * Lista de provincias consideradas turísticas en República Dominicana
 * Estos destinos pueden tener cálculos de dieta diferentes
 */
export const PROVINCIAS_TURISTICAS: string[] = [
  'La Altagracia',
  'La Romana',
  'Puerto Plata',
  'Samaná',
  'Pedernales'
];