import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { GrupalRoutingModule } from './grupal-routing.module';
import { GrupalComponent } from './grupal.component';

// Módulos de terceros
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { ModalModule } from 'ngx-bootstrap/modal';

// Componentes compartidos
import { SelectorHoraComponent } from '../../shared/components/selector-hora/selector-hora.component';
import { ModalDocumentosComponent } from '../../shared/components/modal-documentos/modal-documentos.component';

@NgModule({
  declarations: [
    GrupalComponent
  ],
  imports: [
    CommonModule,
    GrupalRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    BsDatepickerModule.forRoot(),
    ModalModule.forRoot(),
    SelectorHoraComponent,
    ModalDocumentosComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GrupalModule { }