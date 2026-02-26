import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { BsDatepickerConfig } from 'ngx-bootstrap/datepicker';

import { ApiService } from '../../core/services/api.service';
import { CalculosService } from '../../core/services/calculos.service';
import { ValidacionesService } from '../../core/services/validaciones.service';
import { DocumentosService } from '../../core/services/documentos.service';

import { Empleado } from '../../core/models/empleado.model';
import { Destino, PROVINCIAS_TURISTICAS } from '../../core/models/destino.model';
import { Documento } from '../../core/models/documento.model';
import { CalculoDietaPorDia, Viaje } from '../../core/models/viatico.model';
import { ModalDocumentosComponent } from '../../shared/components/modal-documentos/modal-documentos.component';

@Component({
  selector: 'app-individual',
  standalone: false,
  templateUrl: './individual.component.html',
  styleUrls: ['./individual.component.scss']
})
export class IndividualComponent implements OnInit {
  @ViewChild('modalDocumentos') modalDocumentos!: ModalDocumentosComponent;
  
  // Formularios
  busquedaForm: FormGroup;
  viajesForm: FormGroup;
  
  // Datos
  empleado: Empleado | null = null;
  destinos: Destino[] = [];
  destinosFiltrados: Destino[] = [];
  provinciasTuristicas = PROVINCIAS_TURISTICAS;
  resultadosCalculo: CalculoDietaPorDia[] = [];
  
  // Estados
  buscando = false;
  guardando = false;
  empleadoEncontrado = false;
  viajeActualIndex = 0;
  
  // Opciones de fecha
  datePickerConfig: Partial<BsDatepickerConfig> = {
    dateInputFormat: 'DD/MM/YYYY',
    containerClass: 'theme-blue',
    showWeekNumbers: false
  };

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private calculosService: CalculosService,
    private validacionesService: ValidacionesService,
    private documentosService: DocumentosService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {
    // Formulario de búsqueda
    this.busquedaForm = this.fb.group({
      cedula: ['', [Validators.required, this.validacionesService.validadorCedula()]]
    });
    
    // Formulario de viajes
    this.viajesForm = this.fb.group({
      mes: ['', [Validators.required, this.validacionesService.validadorMesActual()]],
      viajes: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.cargarDestinos();
  }

  /**
   * Parsea una fecha en formato ISO (YYYY-MM-DD) como fecha local,
   * evitando problemas de zona horaria UTC
   */
  private parseDateLocal(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  // Getters
  get viajesArray(): FormArray {
    return this.viajesForm.get('viajes') as FormArray;
  }

  // ============================================
  // BÚSQUEDA DE EMPLEADO
  // ============================================
  buscarEmpleado(): void {
    if (this.busquedaForm.invalid) {
      this.toastr.warning('Ingrese una cédula válida (000-0000000-0)', 'Validación');
      return;
    }

    this.buscando = true;
    const cedula = this.busquedaForm.get('cedula')?.value;

    this.apiService.getEmpleado(cedula).subscribe({
      next: (empleado) => {
        this.empleado = empleado;
        this.empleadoEncontrado = true;
        this.toastr.success(`Empleado encontrado: ${empleado.nombreCompleto}`, 'Éxito');
        
        // Inicializar con un viaje
        this.agregarViaje();
        
        // Notificar a Angular que la vista debe actualizarse
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error al buscar empleado:', error);
        this.toastr.error('La cédula ingresada no existe en el sistema', 'Error');
        this.empleado = null;
        this.empleadoEncontrado = false;
        this.cdr.markForCheck();
      },
      complete: () => {
        this.buscando = false;
      }
    });
  }

  // ============================================
  // DESTINOS
  // ============================================
  cargarDestinos(): void {
    this.apiService.getDestinos().subscribe({
      next: (destinos) => {
        this.destinos = destinos;
        this.filtrarDestinos(false);
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error al cargar destinos:', error);
        this.toastr.error('Error al cargar la lista de destinos', 'Error');
        this.cdr.markForCheck();
      }
    });
  }

  filtrarDestinos(esTuristica: boolean): void {
    if (esTuristica) {
      this.destinosFiltrados = this.destinos.filter(d => 
        this.provinciasTuristicas.includes(d.nombre)
      );
    } else {
      this.destinosFiltrados = [...this.destinos];
    }
  }

  // ============================================
  // GESTIÓN DE VIAJES (FORM ARRAY)
  // ============================================
  crearViajeFormGroup(): FormGroup {
    const fechaHoy = new Date().toISOString().split('T')[0];
    
    const viajeGroup = this.fb.group({
      fechaSalida: [fechaHoy, [Validators.required]],
      horaSalida: ['08:00 AM', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/)]],
      fechaRetorno: [fechaHoy, [Validators.required]],
      horaRetorno: ['05:00 PM', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/)]],
      esTuristica: [false],
      idDestino: ['', [Validators.required]],
      documentos: [[], [this.validarDocumentosRequeridos.bind(this)]],
      // Transporte
      esChofer: [false],
      costoTransporte: [0, [Validators.required, Validators.min(0)]],
      comprobantesTransporte: [[], [this.validarComprobantesTransporte.bind(this)]]
    }, {
      validators: (formGroup: AbstractControl) => {
        const salida = formGroup.get('fechaSalida')?.value;
        const retorno = formGroup.get('fechaRetorno')?.value;
        
        if (!salida || !retorno) {
          return null;
        }
        
        const fechaSalida = this.parseDateLocal(salida);
        const fechaRetorno = this.parseDateLocal(retorno);
        
        if (fechaRetorno < fechaSalida) {
          return { fechaRetornoMenor: true };
        }
        
        return null;
      }
    });

    // Validación condicional: si es chofer, requiere comprobantes
    viajeGroup.get('esChofer')?.valueChanges.subscribe((esChofer) => {
      const comprobantesControl = viajeGroup.get('comprobantesTransporte');
      const costoControl = viajeGroup.get('costoTransporte');
      
      if (esChofer) {
        // Si es chofer: requiere comprobantes
        comprobantesControl?.setValidators([this.validarComprobantesTransporte.bind(this)]);
        costoControl?.setValidators([Validators.required, Validators.min(0)]);
      } else {
        // Si NO es chofer: limpiar valores y no requiere validación
        costoControl?.setValue(0);
        comprobantesControl?.setValue([] as any);
        comprobantesControl?.setValidators([]);
        costoControl?.setValidators([]);
      }
      
      comprobantesControl?.updateValueAndValidity({ emitEvent: false });
      costoControl?.updateValueAndValidity({ emitEvent: false });
    });

    return viajeGroup;
  }

  validarDocumentosRequeridos(control: AbstractControl): ValidationErrors | null {
    const documentos = control.value as any[];
    if (!documentos || documentos.length === 0) {
      return { documentosRequeridos: true };
    }
    return null;
  }

  validarComprobantesTransporte(control: AbstractControl): ValidationErrors | null {
    // Este validador solo es llamado si esChofer es true
    const comprobantes = control.value as any[];
    if (!comprobantes || comprobantes.length === 0) {
      return { comprobantesTransporteRequeridos: true };
    }
    return null;
  }

  agregarViaje(): void {
    const nuevoViaje = this.crearViajeFormGroup();
    this.viajesArray.push(nuevoViaje);
    
    // Suscribirse a cambios para recalcular
    nuevoViaje.valueChanges.subscribe(() => {
      this.calcularTodosLosViajes();
    });
    
    // Si es el primer viaje, calcular inmediatamente
    if (this.viajesArray.length === 1) {
      this.calcularTodosLosViajes();
    }
  }

  eliminarViaje(index: number): void {
    this.viajesArray.removeAt(index);
    this.calcularTodosLosViajes();
    
    if (this.viajesArray.length === 0) {
      this.agregarViaje();
    }
  }

  // ============================================
  // MANEJO DE DOCUMENTOS
  // ============================================
  abrirModalDocumentos(index: number): void {
    this.viajeActualIndex = index;
    const viajeForm = this.viajesArray.at(index);
    const documentosActuales = viajeForm.get('documentos')?.value || [];
    this.modalDocumentos.abrirModal(documentosActuales);
  }

  onDocumentosSeleccionados(documentos: Documento[]): void {
    const viajeForm = this.viajesArray.at(this.viajeActualIndex);
    viajeForm.patchValue({ documentos });
    
    if (documentos.length > 0) {
      this.toastr.success(`${documentos.length} documento(s) adjuntado(s)`, 'Éxito');
    }
  }

  // ============================================
  // MANEJO DE COMPROBANTES DE TRANSPORTE
  // ============================================
  abrirModalComprobantes(index: number): void {
    this.viajeActualIndex = index;
    const viajeForm = this.viajesArray.at(index);
    const comprobantesActuales = viajeForm.get('comprobantesTransporte')?.value || [];
    this.modalDocumentos.abrirModal(comprobantesActuales, 'comprobantes');
  }

  onComprobantesSeleccionados(comprobantes: Documento[]): void {
    const viajeForm = this.viajesArray.at(this.viajeActualIndex);
    viajeForm.patchValue({ comprobantesTransporte: comprobantes });
    
    if (comprobantes.length > 0) {
      this.toastr.success(`${comprobantes.length} comprobante(s) de transporte adjuntado(s)`, 'Éxito');
    }
  }

  // ============================================
  // CÁLCULOS
  // ============================================
  calcularTodosLosViajes(): void {
    if (!this.empleado || this.viajesArray.length === 0) {
      this.resultadosCalculo = [];
      return;
    }

    let todosLosDias: CalculoDietaPorDia[] = [];

    this.viajesArray.controls.forEach((viajeForm, index) => {
      const viaje = viajeForm.value;
      
      // Buscar el destino seleccionado
      const destino = this.destinos.find(d => d.id === Number(viaje.idDestino));
      
      if (destino && viaje.fechaSalida && viaje.fechaRetorno) {
        const resultados = this.calculosService.calcularViaticosPorViaje(
          this.empleado!.asignacionDiaria,
          viaje.fechaSalida,
          viaje.horaSalida,
          viaje.fechaRetorno,
          viaje.horaRetorno,
          destino.nombre,
          viaje.esTuristica,
          destino.costoTransporte
        );
        
        todosLosDias = [...todosLosDias, ...resultados];
      }
    });

    // Ordenar por fecha
    todosLosDias.sort((a, b) => a.dia.getTime() - b.dia.getTime());
    
    this.resultadosCalculo = todosLosDias;
  }

  // ============================================
  // ACCIONES PRINCIPALES
  // ============================================
  nuevoRegistro(): void {
    this.empleado = null;
    this.empleadoEncontrado = false;
    this.busquedaForm.reset();
    this.viajesForm.reset();
    this.viajesArray.clear();
    this.resultadosCalculo = [];
    this.toastr.info('Formulario limpiado', 'Nuevo registro');
  }

  guardarTodo(): void {
    if (!this.empleado) {
      this.toastr.warning('Debe buscar un empleado primero', 'Validación');
      return;
    }

    // Validar que cada viaje tenga documentos adjuntos
    for (let i = 0; i < this.viajesArray.length; i++) {
      const viajeForm = this.viajesArray.at(i);
      const documentos = viajeForm.get('documentos')?.value;
      
      if (!documentos || documentos.length === 0) {
        this.toastr.warning(`El viaje #${i + 1} debe tener al menos un documento adjunto`, 'Documentos requeridos');
        return;
      }
    }

    // Luego validar que todos los campos requeridos estén completos
    if (this.viajesForm.invalid) {
      this.toastr.warning('Complete todos los campos requeridos correctamente (fechas, horas, destino)', 'Validación');
      return;
    }

    this.guardando = true;
    
    // Construir el payload para el backend
    const viajesPayload: Partial<Viaje>[] = this.viajesArray.controls.map(viajeForm => {
      const viaje = viajeForm.value;
      const fechaViaje = this.parseDateLocal(viaje.fechaSalida);
      return {
        cedula: this.empleado!.cedula,
        mes: fechaViaje.getMonth() + 1,
        anio: fechaViaje.getFullYear(),
        fechaSalida: viaje.fechaSalida,
        horaSalida: viaje.horaSalida,
        fechaRetorno: viaje.fechaRetorno,
        horaRetorno: viaje.horaRetorno,
        idDestino: Number(viaje.idDestino),
        esTuristica: viaje.esTuristica,
        esChofer: viaje.esChofer,
        costoTransporte: viaje.costoTransporte,
        documentos: viaje.documentos.map((doc: Documento) => ({
          nombre: doc.nombre,
          tipo: doc.tipo,
          tamano: doc.tamano
        })),
        comprobantesTransporte: viaje.comprobantesTransporte.map((doc: Documento) => ({
          nombre: doc.nombre,
          tipo: doc.tipo,
          tamano: doc.tamano
        }))
      };
    });

    this.apiService.guardarViaticosIndividual(viajesPayload).subscribe({
      next: (response) => {
        this.toastr.success(response.mensaje, 'Guardado exitoso');
        this.nuevoRegistro(); // Limpiar después de guardar
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error al guardar:', error);
        this.toastr.error('Error al guardar los datos. Intente nuevamente.', 'Error');
        this.cdr.markForCheck();
      },
      complete: () => {
        this.guardando = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ============================================
  // UTILIDADES
  // ============================================
  trackByIndex(index: number): number {
    return index;
  }

  formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2
    }).format(valor);
  }

  getTotalGeneral(): number {
    return this.resultadosCalculo.reduce((sum, item) => sum + item.totalGastos, 0);
  }

  getTotalTransporte(): number {
    return this.resultadosCalculo.reduce((sum, item) => sum + item.transporte, 0);
  }

  getTotalDieta(): number {
    return this.resultadosCalculo.reduce((sum, item) => sum + item.totalDieta, 0);
  }
}