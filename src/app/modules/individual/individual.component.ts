import { Component, OnInit, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
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
    private toastr: ToastrService
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
      },
      error: (error) => {
        console.error('Error al buscar empleado:', error);
        this.toastr.error('La cédula ingresada no existe en el sistema', 'Error');
        this.empleado = null;
        this.empleadoEncontrado = false;
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
      },
      error: (error) => {
        console.error('Error al cargar destinos:', error);
        this.toastr.error('Error al cargar la lista de destinos', 'Error');
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
    const fechaHoy = new Date();
    
    return this.fb.group({
      fechaSalida: [fechaHoy, [Validators.required]],
      horaSalida: ['08:00 AM', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/)]],
      fechaRetorno: [fechaHoy, [Validators.required]],
      horaRetorno: ['05:00 PM', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/)]],
      esTuristica: [false],
      idDestino: ['', [Validators.required]],
      documentos: [[]],
      transporte: [0]
    }, {
      validators: [
        this.validacionesService.validadorFechas(
          this.fb.control(fechaHoy),
          this.fb.control(fechaHoy)
        )
      ]
    });
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
          new Date(viaje.fechaSalida),
          viaje.horaSalida,
          new Date(viaje.fechaRetorno),
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

    if (this.viajesForm.invalid) {
      this.toastr.warning('Complete todos los campos requeridos correctamente', 'Validación');
      return;
    }

    // Validar que cada viaje tenga al menos un documento
    for (let i = 0; i < this.viajesArray.length; i++) {
      const viajeForm = this.viajesArray.at(i);
      const documentos = viajeForm.get('documentos')?.value;
      
      if (!documentos || documentos.length === 0) {
        this.toastr.warning(`El viaje #${i + 1} debe tener al menos un documento adjunto`, 'Validación');
        return;
      }
    }

    this.guardando = true;
    
    // Construir el payload para el backend
    const viajesPayload: Partial<Viaje>[] = this.viajesArray.controls.map(viajeForm => {
      const viaje = viajeForm.value;
      return {
        cedula: this.empleado!.cedula,
        mes: new Date(viaje.fechaSalida).getMonth() + 1,
        anio: new Date(viaje.fechaSalida).getFullYear(),
        fechaSalida: viaje.fechaSalida,
        horaSalida: viaje.horaSalida,
        fechaRetorno: viaje.fechaRetorno,
        horaRetorno: viaje.horaRetorno,
        idDestino: Number(viaje.idDestino),
        esTuristica: viaje.esTuristica,
        documentos: viaje.documentos.map((doc: Documento) => ({
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
      },
      error: (error) => {
        console.error('Error al guardar:', error);
        this.toastr.error('Error al guardar los datos. Intente nuevamente.', 'Error');
      },
      complete: () => {
        this.guardando = false;
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