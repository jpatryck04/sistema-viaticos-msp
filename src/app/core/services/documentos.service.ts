import { Injectable } from '@angular/core';
import { Documento } from '../models/documento.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DocumentosService {
  
  private maxFileSize = environment.maxFileSize;
  private allowedTypes = environment.allowedFileTypes;

  constructor() {}

  /**
   * Valida un archivo antes de subirlo
   */
  validarArchivo(file: File): { valido: boolean; mensaje?: string } {
    // Validar tamaño
    if (file.size > this.maxFileSize) {
      return {
        valido: false,
        mensaje: `El archivo ${file.name} excede el tamaño máximo de 5MB`
      };
    }

    // Validar tipo
    if (!this.allowedTypes.includes(file.type)) {
      return {
        valido: false,
        mensaje: `El tipo de archivo ${file.type} no está permitido`
      };
    }

    return { valido: true };
  }

  /**
   * Convierte un File a objeto Documento
   */
  fileToDocumento(file: File): Documento {
    return {
      nombre: file.name,
      archivo: file,
      tipo: file.type,
      tamano: file.size,
      fechaSubida: new Date()
    };
  }

  /**
   * Obtiene el icono apropiado según el tipo de archivo
   */
  getIconoPorTipo(tipo: string): string {
    if (tipo.includes('pdf')) return 'bi-file-pdf-fill text-danger';
    if (tipo.includes('image')) return 'bi-file-image-fill text-primary';
    if (tipo.includes('word') || tipo.includes('document')) return 'bi-file-word-fill text-primary';
    if (tipo.includes('excel') || tipo.includes('sheet')) return 'bi-file-excel-fill text-success';
    return 'bi-file-text-fill';
  }

  /**
   * Formatea el tamaño del archivo
   */
  formatearTamano(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}