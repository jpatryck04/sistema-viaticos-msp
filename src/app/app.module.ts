import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Rutas
import { AppRoutingModule } from './app-routing.module';

// Componente principal
import { AppComponent } from './app.component';

// Componentes compartidos
import { HeaderComponent } from './shared/components/header/header.component';
import { SelectorHoraComponent } from './shared/components/selector-hora/selector-hora.component';
import { ModalDocumentosComponent } from './shared/components/modal-documentos/modal-documentos.component';

// Módulos de terceros
import { ModalModule } from 'ngx-bootstrap/modal';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { TimepickerModule } from 'ngx-bootstrap/timepicker';
import { ToastrModule } from 'ngx-toastr';

@NgModule({
  declarations: [],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AppComponent,
    SelectorHoraComponent,
    ModalDocumentosComponent,
    ModalModule.forRoot(),
    BsDatepickerModule.forRoot(),
    TimepickerModule.forRoot(),
    ToastrModule.forRoot({
      positionClass: 'toast-top-right',
      timeOut: 5000,
      preventDuplicates: true,
      progressBar: true
    })
  ],
  providers: [
    // IMPORTANTE: No se registra ningún MockInterceptor
    // Todos los datos DEBEN venir del API en localhost:3000
    // Ver environment.ts para la URL del API
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }