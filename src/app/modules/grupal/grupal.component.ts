import { Component, OnInit, ViewChild, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { BsDatepickerConfig } from 'ngx-bootstrap/datepicker';
import * as XLSX from 'xlsx';

import { ApiService } from '../../core/services/api.service';
import { CalculosService } from '../../core/services/calculos.service';
import { ValidacionesService } from '../../core/services/validaciones.service';
import { DocumentosService } from '../../core/services/documentos.service';

import { Empleado } from '../../core/models/empleado.model';
import { Destino, PROVINCIAS_TURISTICAS } from '../../core/models/destino.model';
import { Documento } from '../../core/models/documento.model';
import { CalculoDietaPorDia } from '../../core/models/viatico.model';
import { ModalDocumentosComponent } from '../../shared/components/modal-documentos/modal-documentos.component';

@Component({
  selector: 'app-grupal',
  standalone: false,
  templateUrl: './grupal.component.html',
  styleUrls: ['./grupal.component.scss']
})
export class GrupalComponent implements OnInit {
  @ViewChild('modalDocumentos') modalDocumentos!: ModalDocumentosComponent;
  
  // Formularios
  filtrosForm: FormGroup;
  viajesForm: FormGroup;
  
  // Datos
  destinos: Destino[] = [];
  provinciasTuristicas = PROVINCIAS_TURISTICAS;
  empleadosCache: Map<string, Empleado> = new Map();
  
  // Estados
  guardando = false;
  exportando = false;
  filaActualIndex = 0;
  cedulasEnUso: Set<string> = new Set();
  
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
    // Formulario de filtros
    this.filtrosForm = this.fb.group({
      mes: ['', [Validators.required, this.validacionesService.validadorMesActual()]],
      departamento: ['']
    });
    
    // Formulario de viajes
    this.viajesForm = this.fb.group({
      viajes: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.cargarDestinos();
    this.agregarFila(); // Agregar primera fila vacía
  }

  // Getters
  get viajesArray(): FormArray {
    return this.viajesForm.get('viajes') as FormArray;
  }

  // ============================================
  // CARGAR DATOS INICIALES
  // ============================================
  cargarDestinos(): void {
    this.apiService.getDestinos().subscribe({
      next: (destinos) => {
        this.destinos = destinos;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error al cargar destinos:', error);
        this.toastr.error('Error al cargar la lista de destinos', 'Error');
        this.cdr.markForCheck();
      }
    });
  }

  // ============================================
  // GESTIÓN DE FILAS DINÁMICAS
  // ============================================
  crearFilaFormGroup(): FormGroup {
    const fechaHoy = new Date().toISOString().split('T')[0];
    
    const fila = this.fb.group({
      id: [crypto.randomUUID()], // Identificador único para la fila
      cedula: ['', [Validators.required, this.validacionesService.validadorCedula()]],
      nombre: [{ value: '', disabled: true }],
      cargo: [{ value: '', disabled: true }],
      asignacionDiaria: [{ value: 0, disabled: true }],
      fechaSalida: [fechaHoy, [Validators.required]],
      horaSalida: ['08:00 AM', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/)]],
      fechaRetorno: [fechaHoy, [Validators.required]],
      horaRetorno: ['05:00 PM', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/)]],
      esTuristica: [false],
      idDestino: ['', [Validators.required]],
      nombreDestino: [''],
      transporte: [0],
      totalCalculado: [0],
      documentos: [[], [this.validarDocumentosRequeridos.bind(this)]],
      empleadoValido: [false],
      fechaValida: [true]
    }, {
      validators: (control: AbstractControl) => {
        const salida = control.get('fechaSalida')?.value;
        const retorno = control.get('fechaRetorno')?.value;
        
        if (!salida || !retorno) {
          return null;
        }
        
        const fechaSalida = new Date(salida);
        const fechaRetorno = new Date(retorno);
        
        if (fechaRetorno < fechaSalida) {
          return { fechaRetornoMenor: true };
        }
        
        return null;
      }
    })

    // Suscribirse a cambios en cédula
    fila.get('cedula')?.valueChanges.subscribe(cedula => {
      if (cedula) {
        this.onCedulaChange(fila, cedula);
      }
    });

    // Suscribirse a cambios para recalcular total
    fila.valueChanges.subscribe(() => {
      this.calcularTotalFila(fila);
    });

    return fila;
  }

  agregarFila(): void {
    const nuevaFila = this.crearFilaFormGroup();
    this.viajesArray.push(nuevaFila);
  }

  validarDocumentosRequeridos(control: AbstractControl): ValidationErrors | null {
    const documentos = control.value as any[];
    if (!documentos || documentos.length === 0) {
      return { documentosRequeridos: true };
    }
    return null;
  }

  eliminarFila(index: number): void {
    const fila = this.viajesArray.at(index);
    const cedula = fila.get('cedula')?.value;
    
    // Eliminar cédula del set de usadas
    if (cedula) {
      this.cedulasEnUso.delete(cedula);
    }
    
    this.viajesArray.removeAt(index);
    
    if (this.viajesArray.length === 0) {
      this.agregarFila();
    }
  }

  // ============================================
  // AUTOCOMPLETADO POR CÉDULA
  // ============================================
  onCedulaChange(fila: FormGroup, cedula: string): void {
    if (!cedula || cedula.length < 13) { // Formato completo: 000-0000000-0 = 13 caracteres
      fila.patchValue({ empleadoValido: false }, { emitEvent: false });
      this.cdr.markForCheck();
      return;
    }

    // Validar formato
    const validadorResult = this.validacionesService.validadorCedula()({ value: cedula } as any);
    if (validadorResult !== null) {
      fila.patchValue({ empleadoValido: false }, { emitEvent: false });
      this.cdr.markForCheck();
      return;
    }

    // Verificar si la cédula ya está en uso en otra fila
    if (this.cedulasEnUso.has(cedula)) {
      this.toastr.warning('Este empleado ya está registrado en otra fila', 'Cédula duplicada');
      fila.patchValue({ empleadoValido: false }, { emitEvent: false });
      this.cdr.markForCheck();
      return;
    }

    // Buscar en caché primero
    if (this.empleadosCache.has(cedula)) {
      this.cargarEmpleadoEnFila(fila, this.empleadosCache.get(cedula)!);
      return;
    }

    // Buscar en API
    this.apiService.getEmpleado(cedula).subscribe({
      next: (empleado) => {
        this.empleadosCache.set(cedula, empleado);
        this.cargarEmpleadoEnFila(fila, empleado);
      },
      error: () => {
        fila.patchValue({
          nombre: '',
          cargo: '',
          asignacionDiaria: 0,
          empleadoValido: false
        }, { emitEvent: false });
        this.cdr.markForCheck();
        this.toastr.error('La cédula ingresada no existe', 'Error');
      }
    });
  }

  cargarEmpleadoEnFila(fila: FormGroup, empleado: Empleado): void {
    // Marcar cédula como usada
    const cedulaAnterior = fila.get('cedula')?.value;
    if (cedulaAnterior) {
      this.cedulasEnUso.delete(cedulaAnterior);
    }
    this.cedulasEnUso.add(empleado.cedula);

    fila.patchValue({
      nombre: empleado.nombreCompleto,
      cargo: empleado.cargo,
      asignacionDiaria: empleado.asignacionDiaria,
      empleadoValido: true
    }, { emitEvent: false });
    
    // Notificar a Angular que la vista debe ser verificada
    this.cdr.markForCheck();
  }

  // ============================================
  // CÁLCULOS
  // ============================================
  calcularTotalFila(fila: FormGroup): void {
    const asignacionDiaria = fila.get('asignacionDiaria')?.value;
    const fechaSalida = fila.get('fechaSalida')?.value;
    const horaSalida = fila.get('horaSalida')?.value;
    const fechaRetorno = fila.get('fechaRetorno')?.value;
    const horaRetorno = fila.get('horaRetorno')?.value;
    const idDestino = fila.get('idDestino')?.value;
    const esTuristica = fila.get('esTuristica')?.value;

    if (!asignacionDiaria || !fechaSalida || !fechaRetorno || !idDestino) {
      return;
    }

    const destino = this.destinos.find(d => d.id === Number(idDestino));
    if (!destino) return;

    // Guardar nombre del destino
    fila.patchValue({ nombreDestino: destino.nombre }, { emitEvent: false });

    const resultados = this.calculosService.calcularViaticosPorViaje(
      asignacionDiaria,
      new Date(fechaSalida),
      horaSalida,
      new Date(fechaRetorno),
      horaRetorno,
      destino.nombre,
      esTuristica,
      destino.costoTransporte
    );

    const total = resultados.reduce((sum, item) => sum + item.totalGastos, 0);
    fila.patchValue({ totalCalculado: total }, { emitEvent: false });
    this.cdr.markForCheck();
  }

  // ============================================
  // MANEJO DE DOCUMENTOS
  // ============================================
  abrirModalDocumentos(index: number): void {
    this.filaActualIndex = index;
    const fila = this.viajesArray.at(index);
    const documentosActuales = fila.get('documentos')?.value || [];
    this.modalDocumentos.abrirModal(documentosActuales);
  }

  onDocumentosSeleccionados(documentos: Documento[]): void {
    const fila = this.viajesArray.at(this.filaActualIndex);
    fila.patchValue({ documentos });
    
    if (documentos.length > 0) {
      this.toastr.success(`${documentos.length} documento(s) adjuntado(s)`, 'Éxito');
    }
  }

  // ============================================
  // ACCIONES PRINCIPALES
  // ============================================
  guardarTodo(): void {
    // Validar que haya al menos una fila con datos
    if (this.viajesArray.length === 0) {
      this.toastr.warning('Agregue al menos un registro', 'Validación');
      return;
    }

    // Validar cada fila
    let filasValidas = true;
    const viajesPayload: any[] = [];

    for (let i = 0; i < this.viajesArray.length; i++) {
      const fila = this.viajesArray.at(i);
      
      // Validar que la fila tenga datos
      if (!fila.get('cedula')?.value) {
        this.toastr.warning(`Fila #${i + 1}: Cédula requerida`, 'Validación');
        filasValidas = false;
        break;
      }

      // Validar que el empleado sea válido
      if (!fila.get('empleadoValido')?.value) {
        this.toastr.warning(`Fila #${i + 1}: Empleado no válido`, 'Validación');
        filasValidas = false;
        break;
      }

      // Validar destino
      if (!fila.get('idDestino')?.value) {
        this.toastr.warning(`Fila #${i + 1}: Destino requerido`, 'Validación');
        filasValidas = false;
        break;
      }

      // Validar documentos
      const documentos = fila.get('documentos')?.value;
      if (!documentos || documentos.length === 0) {
        this.toastr.warning(`Fila #${i + 1}: Debe adjuntar al menos un documento`, 'Validación');
        filasValidas = false;
        break;
      }

      // Construir payload
      const viaje = fila.value;
      viajesPayload.push({
        cedula: viaje.cedula,
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
      });
    }

    if (!filasValidas) return;

    this.guardando = true;
    
    this.apiService.guardarViaticosGrupal(viajesPayload).subscribe({
      next: (response) => {
        this.toastr.success(response.mensaje, 'Guardado exitoso');
        this.limpiarFormulario();
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

  exportarExcel(): void {
    if (this.viajesArray.length === 0) {
      this.toastr.warning('No hay datos para exportar', 'Validación');
      return;
    }

    this.exportando = true;

    try {
      // Preparar datos para Excel
      const datos: any[] = [];
      
      this.viajesArray.controls.forEach((fila, index) => {
        const viaje = fila.value;
        datos.push({
          '#': index + 1,
          'Cédula': viaje.cedula,
          'Nombre': viaje.nombre,
          'Cargo': viaje.cargo,
          'Asig. Diaria': viaje.asignacionDiaria,
          'Fecha Salida': this.formatearFecha(new Date(viaje.fechaSalida)),
          'Hora Salida': viaje.horaSalida,
          'Fecha Retorno': this.formatearFecha(new Date(viaje.fechaRetorno)),
          'Hora Retorno': viaje.horaRetorno,
          'Destino': viaje.nombreDestino,
          'Turística': viaje.esTuristica ? 'SÍ' : 'NO',
          'Total Calculado': viaje.totalCalculado,
          'Documentos': (viaje.documentos || []).length
        });
      });

      // Crear libro de Excel
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(datos);
      
      // Ajustar ancho de columnas
      const colWidths = [
        { wch: 5 },   // #
        { wch: 15 },  // Cédula
        { wch: 40 },  // Nombre
        { wch: 30 },  // Cargo
        { wch: 15 },  // Asig. Diaria
        { wch: 15 },  // Fecha Salida
        { wch: 12 },  // Hora Salida
        { wch: 15 },  // Fecha Retorno
        { wch: 12 },  // Hora Retorno
        { wch: 25 },  // Destino
        { wch: 10 },  // Turística
        { wch: 15 },  // Total
        { wch: 10 }   // Documentos
      ];
      ws['!cols'] = colWidths;

      // Agregar hoja al libro
      XLSX.utils.book_append_sheet(wb, ws, 'Viáticos Grupales');

      // Generar nombre de archivo
      const fecha = new Date();
      const nombreArchivo = `viaticos_grupal_${fecha.getFullYear()}${(fecha.getMonth()+1).toString().padStart(2,'0')}${fecha.getDate().toString().padStart(2,'0')}.xlsx`;

      // Descargar archivo
      XLSX.writeFile(wb, nombreArchivo);
      
      this.toastr.success('Archivo Excel generado correctamente', 'Exportación exitosa');
    } catch (error) {
      console.error('Error al exportar:', error);
      this.toastr.error('Error al generar el archivo Excel', 'Error');
    } finally {
      this.exportando = false;
    }
  }

  limpiarFormulario(): void {
    this.viajesArray.clear();
    this.cedulasEnUso.clear();
    this.agregarFila();
  }

  // ============================================
  // UTILIDADES
  // ============================================
  trackByIndex(index: number, item: any): string {
    return item.get('id')?.value || index.toString();
  }

  formatearFecha(fecha: Date): string {
    if (!fecha) return '';
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const anio = fecha.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2
    }).format(valor);
  }

  onKeyUp(event: KeyboardEvent, index: number): void {
    const target = event.target as HTMLInputElement;
    const cedula = target.value;
    
    // Si presionó TAB, intentar cargar empleado
    if (event.key === 'Tab' && cedula && cedula.length >= 13) {
      event.preventDefault();
      const fila = this.viajesArray.at(index) as FormGroup;
      this.onCedulaChange(fila, cedula);
      
      // Mover al siguiente campo después de que se cargue el empleado
      setTimeout(() => {
        const nextInput = (event.target as HTMLElement).parentElement?.nextElementSibling?.querySelector('input');
        if (nextInput) {
          (nextInput as HTMLInputElement).focus();
        }
      }, 200);
    }
    
    // Si es la última fila y se está escribiendo, agregar nueva fila
    if (index === this.viajesArray.length - 1 && cedula.length > 0) {
      this.agregarFila();
    }
  }
}