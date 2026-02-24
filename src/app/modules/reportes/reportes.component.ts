import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { ApiService } from '../../core/services/api.service';

interface ReporteItem {
  id: number;
  fecha: string;
  empleado: string;
  cedula: string;
  destino: string;
  totalDieta: number;
  transporte: number;
  totalGeneral: number;
  estado: string;
}

@Component({
  selector: 'app-reportes',
  standalone: false,
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.scss']
})
export class ReportesComponent implements OnInit {
  filtrosForm: FormGroup;
  
  // Array inicialmente vacío - los datos se cargan desde el API
  datosReporte: ReporteItem[] = [];
  datosFiltrados: ReporteItem[] = [];
  cargando = false;
  exportando = false;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {
    this.filtrosForm = this.fb.group({
      fechaInicio: ['', Validators.required],
      fechaFin: ['', Validators.required],
      cedula: [''],
      departamento: [''],
      estado: ['']
    });
  }

  ngOnInit(): void {
    this.cargarReportes();
  }

  cargarReportes(): void {
    this.cargando = true;
    
    this.apiService.getReportes().subscribe({
      next: (datos) => {
        this.datosReporte = datos;
        this.datosFiltrados = [...this.datosReporte];
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error al cargar reportes:', error);
        this.toastr.error('Error al cargar los reportes', 'Error');
        this.cargando = false;
        this.cdr.markForCheck();
      }
    });
  }

  aplicarFiltros(): void {
    if (this.filtrosForm.invalid) {
      this.toastr.warning('Complete los campos requeridos (Fecha Inicio y Fecha Fin)', 'Validación');
      this.cdr.markForCheck();
      return;
    }

    this.cargando = true;

    const filtros = {
      fechaInicio: this.filtrosForm.get('fechaInicio')?.value,
      fechaFin: this.filtrosForm.get('fechaFin')?.value,
      cedula: this.filtrosForm.get('cedula')?.value || undefined,
      departamento: this.filtrosForm.get('departamento')?.value || undefined,
      estado: this.filtrosForm.get('estado')?.value || undefined
    };

    this.apiService.getReportes(filtros).subscribe({
      next: (datos) => {
        this.datosFiltrados = datos;
        this.cargando = false;
        this.toastr.success(`${datos.length} registros encontrados`, 'Búsqueda completada');
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error al aplicar filtros:', error);
        this.toastr.error('Error al generar el reporte', 'Error');
        this.cargando = false;
        this.cdr.markForCheck();
      }
    });
  }

  limpiarFiltros(): void {
    this.filtrosForm.reset();
    this.cargarReportes();
  }

  // ============================================
  // EXPORTACIONES
  // ============================================
  exportarExcel(): void {
    if (this.datosFiltrados.length === 0) {
      this.toastr.warning('No hay datos para exportar', 'Validación');
      return;
    }

    this.exportando = true;

    try {
      // Preparar datos
      const datos = this.datosFiltrados.map(item => ({
        'ID': item.id,
        'Fecha': item.fecha,
        'Cédula': item.cedula,
        'Empleado': item.empleado,
        'Destino': item.destino,
        'Total Dieta': item.totalDieta,
        'Transporte': item.transporte,
        'Total General': item.totalGeneral,
        'Estado': item.estado
      }));

      // Crear libro de Excel
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(datos);
      
      // Ajustar ancho de columnas
      const colWidths = [
        { wch: 5 },   // ID
        { wch: 12 },  // Fecha
        { wch: 15 },  // Cédula
        { wch: 40 },  // Empleado
        { wch: 25 },  // Destino
        { wch: 15 },  // Total Dieta
        { wch: 12 },  // Transporte
        { wch: 15 },  // Total General
        { wch: 12 }   // Estado
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Reporte Viáticos');

      const fecha = new Date();
      const nombreArchivo = `reporte_viaticos_${fecha.getFullYear()}${(fecha.getMonth()+1).toString().padStart(2,'0')}${fecha.getDate().toString().padStart(2,'0')}.xlsx`;

      XLSX.writeFile(wb, nombreArchivo);
      this.toastr.success('Reporte Excel generado correctamente');
    } catch (error) {
      console.error('Error al exportar:', error);
      this.toastr.error('Error al generar el archivo Excel');
    } finally {
      this.exportando = false;
    }
  }

  exportarPDF(): void {
    if (this.datosFiltrados.length === 0) {
      this.toastr.warning('No hay datos para exportar', 'Validación');
      return;
    }

    this.exportando = true;

    try {
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(16);
      doc.setTextColor(31, 60, 115); // #1F3C73
      doc.text('MINISTERIO DE SALUD PÚBLICA', 105, 15, { align: 'center' });
      doc.setFontSize(12);
      doc.text('Reporte de Viáticos', 105, 22, { align: 'center' });
      
      // Fecha del reporte
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-DO')}`, 14, 30);

      // Tabla de datos
      autoTable(doc, {
        head: [['ID', 'Fecha', 'Cédula', 'Empleado', 'Destino', 'Dieta', 'Transp.', 'Total', 'Estado']],
        body: this.datosFiltrados.map(item => [
          item.id.toString(),
          item.fecha,
          item.cedula,
          item.empleado,
          item.destino,
          `RD$ ${item.totalDieta.toFixed(2)}`,
          `RD$ ${item.transporte.toFixed(2)}`,
          `RD$ ${item.totalGeneral.toFixed(2)}`,
          item.estado
        ]),
        startY: 35,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [31, 60, 115] },
        alternateRowStyles: { fillColor: [240, 240, 240] }
      });

      // Guardar PDF
      const fecha = new Date();
      const nombreArchivo = `reporte_viaticos_${fecha.getFullYear()}${(fecha.getMonth()+1).toString().padStart(2,'0')}${fecha.getDate().toString().padStart(2,'0')}.pdf`;
      
      doc.save(nombreArchivo);
      this.toastr.success('Reporte PDF generado correctamente');
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      this.toastr.error('Error al generar el archivo PDF');
    } finally {
      this.exportando = false;
    }
  }

  // ============================================
  // UTILIDADES
  // ============================================
  formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2
    }).format(valor);
  }

  getTotalGeneral(): number {
    return this.datosFiltrados.reduce((sum, item) => sum + item.totalGeneral, 0);
  }

  getTotalDieta(): number {
    return this.datosFiltrados.reduce((sum, item) => sum + item.totalDieta, 0);
  }

  getTotalTransporte(): number {
    return this.datosFiltrados.reduce((sum, item) => sum + item.transporte, 0);
  }

  getTotalPagado(): number {
    return this.datosFiltrados
      .filter(item => item.estado === 'Pagado')
      .reduce((sum, item) => sum + item.totalGeneral, 0);
  }

  getTotalPendiente(): number {
    return this.datosFiltrados
      .filter(item => item.estado === 'Pendiente')
      .reduce((sum, item) => sum + item.totalGeneral, 0);
  }

  getTotalProceso(): number {
    return this.datosFiltrados
      .filter(item => item.estado === 'En Proceso')
      .reduce((sum, item) => sum + item.totalGeneral, 0);
  }

  getPromedioPorViaje(): number {
    if (this.datosFiltrados.length === 0) return 0;
    return this.getTotalGeneral() / this.datosFiltrados.length;
  }
}