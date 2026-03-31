import { Component } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { BsModalService, BsModalRef, ModalModule } from 'ngx-bootstrap/modal';
import { TemplateRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, ModalModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  @ViewChild('confirmLogoutModal') confirmLogoutModal!: TemplateRef<any>;
  
  appTitle = 'Sistema de Gestión de Viáticos';
  currentYear = new Date().getFullYear();
  modalRef: BsModalRef | null = null;
  
  constructor(
    private router: Router,
    private toastr: ToastrService,
    private modalService: BsModalService
  ) {}
  
  logout(): void {
    this.modalRef = this.modalService.show(this.confirmLogoutModal, {
      class: 'modal-dialog-centered',
      backdrop: 'static',
      keyboard: false
    });
  }
  
  confirmarLogout(): void {
    localStorage.clear();
    sessionStorage.clear();
    
    this.modalRef?.hide();
    this.toastr.success('Sesión cerrada correctamente', 'Hasta luego');
    
    setTimeout(() => {
      this.router.navigate(['/']);
    }, 1000);
  }
  
  cancelarLogout(): void {
    this.modalRef?.hide();
  }
}