import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef, ElementRef } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { BsDatepickerConfig } from 'ngx-bootstrap/datepicker';

import { ApiService } from '../../core/services/api.service';
import { CalculosService } from '../../core/services/calculos.service';
import { ValidacionesService } from '../../core/services/validaciones.service';
import { DocumentosService } from '../../core/services/documentos.service';

import { Empleado } from '../../core/models/empleado.model';
import { Destino, PROVINCIAS_NO_TURISTICAS, PROVINCIAS_TURISTICAS } from '../../core/models/destino.model';
import { Documento } from '../../core/models/documento.model';
import { CalculoDietaPorDia, Viaje } from '../../core/models/viatico.model';
import { ModalDocumentosComponent } from '../../shared/components/modal-documentos/modal-documentos.component';

interface MesAnioImpresion {
  mes: string;
  anio: number;
}

@Component({
  selector: 'app-individual',
  standalone: false,
  templateUrl: './individual.component.html',
  styleUrls: ['./individual.component.scss']
})
export class IndividualComponent implements OnInit, OnDestroy {
  @ViewChild('modalDocumentos') modalDocumentos!: ModalDocumentosComponent;
  @ViewChild('fileTransporteInput') fileTransporteInput?: ElementRef<HTMLInputElement>;
  @ViewChild('printArea') printArea?: ElementRef<HTMLElement>;

  busquedaForm: FormGroup;
  viajesForm: FormGroup;

  empleado: Empleado | null = null;
  destinos: Destino[] = [];
  destinosFiltrados: Destino[] = [];
  provinciasTuristicas = PROVINCIAS_TURISTICAS;
  provinciasNoTuristicas = PROVINCIAS_NO_TURISTICAS;
  resultadosCalculo: CalculoDietaPorDia[] = [];

  buscando = false;
  guardando = false;
  empleadoEncontrado = false;
  viajeActualIndex = 0;

  mostrarPanelTransportePorViaje: Record<number, boolean> = {};
  transporteDiaSeleccionadoPorViaje: Record<number, string> = {};
  transporteMontoTempPorViaje: Record<number, number> = {};
  transporteEvidenciasTempPorViaje: Record<number, Documento[]> = {};
  transportesPorViaje: Record<number, Array<{ fechaISO: string; monto: number; evidencias: Documento[] }>> = {};
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const isPrintShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p';
    if (!isPrintShortcut) {
      return;
    }

    event.preventDefault();
    this.imprimirSoloFormato();
  };

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
    this.busquedaForm = this.fb.group({
      cedula: ['', [Validators.required, this.validacionesService.validadorCedula()]]
    });

    this.viajesForm = this.fb.group({
      mes: ['', [Validators.required, this.validacionesService.validadorMesActual()]],
      actividad: ['', [Validators.required]],
      viajes: this.fb.array([])
    });
  }

  get mesImpresion(): string {
    return this.obtenerMesAnioImpresion().mes;
  }

  get anioImpresion(): number {
    return this.obtenerMesAnioImpresion().anio;
  }

  get actividadImpresion(): string {
    return (this.viajesForm.get('actividad')?.value || '').toString().trim();
  }

  ngOnInit(): void {
    this.cargarDestinos();
    window.addEventListener('keydown', this.handleKeydown);
  }

  ngOnDestroy(): void {
    window.removeEventListener('keydown', this.handleKeydown);
  }

  /**
   * Normaliza valores de fecha a ISO (YYYY-MM-DD).
   */
  private normalizeToISO(value: string | Date): string {
    if (!value) {
      return '';
    }

    if (value instanceof Date) {
      return this.toISODate(value);
    }

    let x = String(value).trim();

    // Formato 2026-03-10T00:00:00.000Z
    if (x.includes('T')) {
      x = x.split('T')[0];
    }

    // Formato local 10/03/2026
    if (x.includes('/')) {
      const parts = x.split('/');
      if (parts.length === 3) {
        const [dd, mm, yyyy] = parts;
        return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
      }
    }

    return x;
  }

  /**
   * Parsea una fecha en formato ISO (YYYY-MM-DD) como fecha local,
   * evitando problemas de zona horaria UTC
   */
  public parseDateLocal(dateString: string | Date): Date {
    const iso = this.normalizeToISO(dateString);
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  public toISODate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  public enumerarDiasISO(desde: Date, hasta: Date): string[] {
    const dias: string[] = [];
    const actual = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate());
    const fin = new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate());

    while (actual.getTime() <= fin.getTime()) {
      dias.push(this.toISODate(actual));
      actual.setDate(actual.getDate() + 1);
    }
    return dias;
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
        // Asignar diaria según tarifas MAP (Resolución 173-2025) en lugar de Salud Pública
        empleado.asignacionDiaria = this.calculosService.getAsignacionDiariaMAP(empleado.cargo);
        this.empleado = empleado;
        this.empleadoEncontrado = true;
        this.toastr.success(`Empleado encontrado: ${empleado.nombreCompleto}`, 'Éxito');

        // Reiniciar viajes para comenzar siempre con un solo registro
        this.viajesArray.clear();
        this.transportesPorViaje = {};
        this.mostrarPanelTransportePorViaje = {};
        this.transporteDiaSeleccionadoPorViaje = {};
        this.transporteMontoTempPorViaje = {};
        this.transporteEvidenciasTempPorViaje = {};
        this.resultadosCalculo = [];

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
      this.destinosFiltrados = this.destinos.filter(d =>
        this.provinciasNoTuristicas.includes(d.nombre)
      );
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
      documentos: [[]],
      // Transporte
      esChofer: [false],
      costoTransporte: [0],
      comprobantesTransporte: [[]]
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

    // Validación condicional: esChofer habilita costo, comprobantes opcional
    viajeGroup.get('esChofer')?.valueChanges.subscribe((esChofer) => {
      const comprobantesControl = viajeGroup.get('comprobantesTransporte');
      const costoControl = viajeGroup.get('costoTransporte');

      if (esChofer) {
        // Si está marcado el checkbox de transporte, ocultamos el manual physical
        // y NO requerimos comprobantes/costo (lo calcula a nivel diario)
        costoControl?.setValue(0);
        comprobantesControl?.setValue([] as any);
        comprobantesControl?.setValidators([]);
        costoControl?.setValidators([]);
      } else {
        comprobantesControl?.setValidators([]);
        costoControl?.setValidators([]);
      }

      comprobantesControl?.updateValueAndValidity({ emitEvent: false });
      costoControl?.updateValueAndValidity({ emitEvent: false });
    });

    return viajeGroup;
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
    const index = this.viajesArray.length - 1;

    this.transportesPorViaje[index] = [];
    this.mostrarPanelTransportePorViaje[index] = false;
    this.transporteDiaSeleccionadoPorViaje[index] = '';
    this.transporteMontoTempPorViaje[index] = 0;
    this.transporteEvidenciasTempPorViaje[index] = [];

    // Suscribirse a cambios para recalcular
    nuevoViaje.valueChanges.subscribe(() => {
      this.sincronizarTransporteParaViaje(index);
      this.calcularTodosLosViajes();
    });

    // Si es el primer viaje, calcular inmediatamente
    if (this.viajesArray.length === 1) {
      this.calcularTodosLosViajes();
    }
  }

  eliminarViaje(index: number): void {
    this.viajesArray.removeAt(index);
    delete this.mostrarPanelTransportePorViaje[index];
    delete this.transporteDiaSeleccionadoPorViaje[index];
    delete this.transporteMontoTempPorViaje[index];
    delete this.transporteEvidenciasTempPorViaje[index];
    delete this.transportesPorViaje[index];

    // mover transportes de los índices siguientes hacia atrás
    const nuevasTransportes: typeof this.transportesPorViaje = {};
    const nuevasMostrar: Record<number, boolean> = {};
    const nuevasDia: Record<number, string> = {};
    const nuevasMonto: Record<number, number> = {};
    const nuevasEvid: Record<number, Documento[]> = {};

    this.viajesArray.controls.forEach((_, i) => {
      nuevasTransportes[i] = this.transportesPorViaje[i < index ? i : i + 1] ?? [];
      nuevasMostrar[i] = this.mostrarPanelTransportePorViaje[i < index ? i : i + 1] ?? false;
      nuevasDia[i] = this.transporteDiaSeleccionadoPorViaje[i < index ? i : i + 1] ?? '';
      nuevasMonto[i] = this.transporteMontoTempPorViaje[i < index ? i : i + 1] ?? 0;
      nuevasEvid[i] = this.transporteEvidenciasTempPorViaje[i < index ? i : i + 1] ?? [];
    });

    this.transportesPorViaje = nuevasTransportes;
    this.mostrarPanelTransportePorViaje = nuevasMostrar;
    this.transporteDiaSeleccionadoPorViaje = nuevasDia;
    this.transporteMontoTempPorViaje = nuevasMonto;
    this.transporteEvidenciasTempPorViaje = nuevasEvid;

    this.calcularTodosLosViajes();

    if (this.viajesArray.length === 0) {
      this.agregarViaje();
    }
  }

  // Transporte por día (UI por viaje)
  togglePanelTransporte(index: number): void {
    this.mostrarPanelTransportePorViaje[index] = !this.mostrarPanelTransportePorViaje[index];

    if (this.mostrarPanelTransportePorViaje[index]) {
      this.sincronizarTransporteParaViaje(index);
    }
  }

  private sincronizarTransporteParaViaje(index: number): void {
    const viajeForm = this.viajesArray.at(index);
    const fechaSalida = viajeForm.get('fechaSalida')?.value;
    const fechaRetorno = viajeForm.get('fechaRetorno')?.value;

    if (!fechaSalida || !fechaRetorno) {
      this.transporteDiaSeleccionadoPorViaje[index] = '';
      return;
    }

    const dias = this.enumerarDiasISO(this.parseDateLocal(fechaSalida), this.parseDateLocal(fechaRetorno));
    if (dias.length === 1) {
      this.transporteDiaSeleccionadoPorViaje[index] = dias[0];
    } else if (!dias.includes(this.transporteDiaSeleccionadoPorViaje[index])) {
      this.transporteDiaSeleccionadoPorViaje[index] = '';
    }
  }

  onTransporteFilesChange(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const archivos = input.files;
    this.transporteEvidenciasTempPorViaje[index] = archivos ? Array.from(archivos).map((file) => ({ nombre: file.name, tipo: file.type || 'archivo', tamano: file.size })) : [] as any;
  }

  guardarTransporteDelDia(index: number): void {
    const viajeForm = this.viajesArray.at(index);
    const fechaSalida = viajeForm.get('fechaSalida')?.value;
    const fechaRetorno = viajeForm.get('fechaRetorno')?.value;

    if (!fechaSalida || !fechaRetorno) {
      this.toastr.warning('Defina un rango de fechas válido primero.', 'Transporte');
      return;
    }

    const dias = this.enumerarDiasISO(this.parseDateLocal(fechaSalida), this.parseDateLocal(fechaRetorno));
    const diaSeleccionadoRaw = this.transporteDiaSeleccionadoPorViaje[index];
    const diaSeleccionado = this.normalizeToISO(diaSeleccionadoRaw);

    if (!diaSeleccionado) {
      this.toastr.warning('Seleccione un día válido del rango de viaje.', 'Transporte');
      return;
    }

    const diasNormalizados = dias.map(d => this.normalizeToISO(d));
    if (!diasNormalizados.includes(diaSeleccionado)) {
      this.toastr.warning('El día seleccionado no forma parte del viaje.', 'Transporte');
      return;
    }

    const monto = Number(this.transporteMontoTempPorViaje[index] ?? 0);
    if (monto <= 0) {
      this.toastr.warning('Ingrese un monto de transporte mayor a 0.', 'Transporte');
      return;
    }

    const lista = this.transportesPorViaje[index] ?? [];
    const existing = lista.find((t) => t.fechaISO === diaSeleccionado);

    if (existing) {
      existing.monto = monto;
      existing.evidencias = [...existing.evidencias, ...(this.transporteEvidenciasTempPorViaje[index] || [])];
    } else {
      lista.push({ fechaISO: diaSeleccionado, monto, evidencias: [...(this.transporteEvidenciasTempPorViaje[index] || [])] });
    }

    this.transportesPorViaje[index] = lista.sort((a, b) => a.fechaISO.localeCompare(b.fechaISO));

    this.transporteMontoTempPorViaje[index] = 0;
    this.transporteEvidenciasTempPorViaje[index] = [];
    if (this.fileTransporteInput?.nativeElement) {
      this.fileTransporteInput.nativeElement.value = '';
    }

    this.toastr.success('Transporte agregado correctamente', 'Transporte');
    this.calcularTodosLosViajes();
  }

  quitarTransporteDia(index: number, fechaISO: string): void {
    const lista = this.transportesPorViaje[index] ?? [];
    this.transportesPorViaje[index] = lista.filter((t) => t.fechaISO !== fechaISO);
    this.calcularTodosLosViajes();
  }

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
        const transportes = this.transportesPorViaje[index] ?? [];
        const mapaTransporte = new Map<string, number>();
        transportes.forEach(t => mapaTransporte.set(this.normalizeToISO(t.fechaISO), t.monto));

        const resultados = this.calculosService.calcularViaticosPorViaje(
          this.empleado!.asignacionDiaria,
          viaje.fechaSalida,
          viaje.horaSalida,
          viaje.fechaRetorno,
          viaje.horaRetorno,
          destino.nombre,
          viaje.esTuristica,
          0,
          viaje.esChofer
        );

        const resultadosConTransporte = resultados.map((r) => {
          const fechaKey = this.normalizeToISO(this.toISODate(r.dia));
          const montoTransporte = mapaTransporte.get(fechaKey) ?? 0;
          const transporteFinal = montoTransporte || (viaje.esChofer ? viaje.costoTransporte : 0);
          const totalGastos = r.totalGastos - r.transporte + transporteFinal;
          return { ...r, transporte: transporteFinal, totalGastos };
        });

        todosLosDias = [...todosLosDias, ...resultadosConTransporte];
      }
    });

    // Ordenar por fecha
    todosLosDias.sort((a, b) => a.dia.getTime() - b.dia.getTime());

    this.resultadosCalculo = todosLosDias;
  }

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

    // Luego validar que todos los campos requeridos estén completos
    if (this.viajesForm.invalid) {
      this.toastr.warning('Complete todos los campos requeridos correctamente (fechas, horas, destino)', 'Validación');
      return;
    }

    this.guardando = true;

    // Construir el payload para el backend
    const viajesPayload: Partial<Viaje>[] = this.viajesArray.controls.map((viajeForm, index) => {
      const viaje = viajeForm.value;
      const fechaViaje = this.parseDateLocal(viaje.fechaSalida);
      const transporteDia = this.transportesPorViaje[index] || [];
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
        })),
        transportePorDia: transporteDia.map((t) => ({
          fechaISO: t.fechaISO,
          monto: t.monto,
          evidencias: t.evidencias.map((doc: Documento) => ({ nombre: doc.nombre, tipo: doc.tipo, tamano: doc.tamano }))
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

  private imprimirContenido(elemento: HTMLElement): void {
    const ventana = window.open('', '_blank', 'width=1024,height=768');
    if (!ventana) {
      this.toastr.warning('El navegador bloqueó la ventana de impresión', 'Impresión');
      return;
    }

    const estilos = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((n) => n.outerHTML)
      .join('\n');

    ventana.document.open();
    ventana.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <base href="${document.baseURI}" />
    ${estilos}
    <style>
      body { margin: 0; padding: 0; background: #fff; }
      .print-only { display: block !important; }
      .no-print { display: none !important; }
    </style>
  </head>
  <body>
    <div class="print-only">${elemento.innerHTML}</div>
  </body>
</html>`);
    ventana.document.close();
    ventana.focus();
    setTimeout(() => {
      ventana.print();
      ventana.close();
    }, 250);
  }

  imprimirSoloFormato(): void {
    if (!this.printArea?.nativeElement) {
      this.toastr.warning('No hay formato listo para imprimir', 'Impresión');
      return;
    }

    this.imprimirContenido(this.printArea.nativeElement);
  }

  private obtenerMesAnioImpresion(): MesAnioImpresion {
    const valorMes = this.viajesForm.get('mes')?.value as string | undefined;
    if (valorMes && /^\d{4}-\d{2}$/.test(valorMes)) {
      const [anioStr, mesStr] = valorMes.split('-');
      const anio = Number(anioStr);
      const mesNumero = Number(mesStr);
      const fecha = new Date(anio, mesNumero - 1, 1);
      return {
        mes: fecha.toLocaleDateString('es-DO', { month: 'long' }).toUpperCase(),
        anio
      };
    }

    const fechaBase = this.resultadosCalculo[0]?.dia ?? new Date();
    return {
      mes: fechaBase.toLocaleDateString('es-DO', { month: 'long' }).toUpperCase(),
      anio: fechaBase.getFullYear()
    };
  }
}

