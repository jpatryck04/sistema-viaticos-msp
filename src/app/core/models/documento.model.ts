/**
 * 📄 MODELO DE DOCUMENTO
 * 
 * Representa archivos adjuntos (comprobantes, recibos, etc.)
 * en los registros de viáticos.
 */

export interface Documento {
  /** Identificador único del documento */
  id?: number;
  
  /** Nombre o descripción del documento */
  nombre: string;
  
  /** Ruta/URL del documento en el servidor */
  ruta?: string;
  
  /** Archivo en memoria (usado en el cliente antes de enviarlo) */
  archivo?: File;
  
  /** Tipo MIME del documento (application/pdf, image/jpeg, etc.) */
  tipo: string;
  
  /** Tamaño del archivo en bytes */
  tamano: number;
  
  /** Fecha de carga del documento */
  fechaSubida?: Date;
}