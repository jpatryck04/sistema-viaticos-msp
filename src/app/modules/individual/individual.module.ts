import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { IndividualRoutingModule } from './individual-routing.module';
import { IndividualComponent } from './individual.component';

// Módulos de terceros
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { ModalModule } from 'ngx-bootstrap/modal';

// Componentes compartidos (standalone)
import { SelectorHoraComponent } from '../../shared/components/selector-hora/selector-hora.component';
import { ModalDocumentosComponent } from '../../shared/components/modal-documentos/modal-documentos.component';

@NgModule({
  declarations: [IndividualComponent],
  imports: [
    CommonModule,
    IndividualRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    BsDatepickerModule.forRoot(),
    ModalModule.forRoot(),
    SelectorHoraComponent,
    ModalDocumentosComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class IndividualModule { }