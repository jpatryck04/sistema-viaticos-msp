export interface Documento {
  id?: number;
  nombre: string;
  ruta?: string;
  archivo?: File;
  tipo: string;
  tamano: number;
  fechaSubida?: Date;
}