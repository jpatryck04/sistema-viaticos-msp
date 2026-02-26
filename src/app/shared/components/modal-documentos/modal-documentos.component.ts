import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Documento } from '../../../core/models/documento.model';
import { DocumentosService } from '../../../core/services/documentos.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-modal-documentos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-documentos.component.html',
  styleUrls: ['./modal-documentos.component.scss']
})
export class ModalDocumentosComponent {
  @Input() viajeIndex: number = 0;
  @Output() documentosSeleccionados = new EventEmitter<Documento[]>();
  @Output() comprobantesSeleccionados = new EventEmitter<Documento[]>();
  
  mostrarModal = false;
  documentos: Documento[] = [];
  archivosSeleccionados: File[] = [];
  tipoActual: 'documentos' | 'comprobantes' = 'documentos'; // Para saber qué tipo estamos manejando
  
  constructor(
    private documentosService: DocumentosService,
    private toastr: ToastrService
  ) {}

  abrirModal(documentosExistentes: Documento[] = [], tipo: 'documentos' | 'comprobantes' = 'documentos'): void {
    this.documentos = [...documentosExistentes];
    this.archivosSeleccionados = [];
    this.tipoActual = tipo;
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validacion = this.documentosService.validarArchivo(file);
      
      if (validacion.valido) {
        this.archivosSeleccionados.push(file);
      } else {
        this.toastr.warning(validacion.mensaje || 'Archivo no válido', 'Archivo no válido');
      }
    }
    
    // Limpiar el input para permitir seleccionar el mismo archivo otra vez
    event.target.value = '';
  }

  agregarArchivos(): void {
    this.archivosSeleccionados.forEach(file => {
      const documento = this.documentosService.fileToDocumento(file);
      this.documentos.push(documento);
    });
    this.archivosSeleccionados = [];
  }

  eliminarDocumento(index: number): void {
    this.documentos.splice(index, 1);
  }

  quitarArchivoPendiente(index: number): void {
    this.archivosSeleccionados.splice(index, 1);
  }

  guardarDocumentos(): void {
    if (this.tipoActual === 'comprobantes') {
      this.comprobantesSeleccionados.emit(this.documentos);
    } else {
      this.documentosSeleccionados.emit(this.documentos);
    }
    this.cerrarModal();
  }

  getIcono(tipo: string): string {
    return this.documentosService.getIconoPorTipo(tipo);
  }

  formatearTamano(bytes: number): string {
    return this.documentosService.formatearTamano(bytes);
  }
}