export interface Destino {
  id: number;
  nombre: string;
  tipo: 'turistica' | 'normal';
  costoTransporte: number;
  distanciaKm: number;
  activo: boolean;
}

export const PROVINCIAS_TURISTICAS: string[] = [
  'La Altagracia',
  'La Romana',
  'Puerto Plata',
  'Samaná',
  'Pedernales'
];