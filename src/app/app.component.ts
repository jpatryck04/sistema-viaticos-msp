/**
 * 📱 COMPONENTE PRINCIPAL DE LA APLICACIÓN
 * 
 * Componente root que organiza la estructura general:
 * - Header con navegación
 * - Router outlet para rutas
 * - Footer con información
 */

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from './shared/components/header/header.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  /**
   * Año actual para el footer
   */
  currentYear = new Date().getFullYear();
}