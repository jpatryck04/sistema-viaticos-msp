import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  appTitle = 'Sistema de Gestión de Viáticos';
  currentYear = new Date().getFullYear();
  
  logout(): void {
    console.log('Cerrando sesión...');
    // Implementar lógica de logout después
  }
}