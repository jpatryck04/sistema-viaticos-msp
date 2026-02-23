import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Empleado } from '../../../core/models/empleado.model';
import { CalculoDietaPorDia } from '../../../core/models/viatico.model';

@Component({
  selector: 'app-formato-impresion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './formato-impresion.component.html',
  styleUrls: ['./formato-impresion.component.scss']
})
export class FormatoImpresionComponent {
  @Input() empleado: Empleado | null = null;
  @Input() viajes: CalculoDietaPorDia[] = [];
  @Input() mes: string = '';
  @Input() anio: number = 0;

  getTotalDieta(): number {
    return this.viajes.reduce((sum, item) => sum + item.totalDieta, 0);
  }

  getTotalTransporte(): number {
    return this.viajes.reduce((sum, item) => sum + item.transporte, 0);
  }

  getTotalGeneral(): number {
    return this.viajes.reduce((sum, item) => sum + item.totalGastos, 0);
  }

  formatearMonto(valor: number): string {
    return new Intl.NumberFormat('es-DO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valor);
  }

  // Para el encabezado del PDF
  fechaActual = new Date();
  fechaEmision = `${this.fechaActual.getDate().toString().padStart(2, '0')}/${(this.fechaActual.getMonth() + 1).toString().padStart(2, '0')}/${this.fechaActual.getFullYear()}`;
}