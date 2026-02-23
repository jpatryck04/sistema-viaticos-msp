import { Component, forwardRef, Input, OnInit } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-selector-hora',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './selector-hora.component.html',
  styleUrls: ['./selector-hora.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectorHoraComponent),
      multi: true
    }
  ]
})
export class SelectorHoraComponent implements OnInit, ControlValueAccessor {
  @Input() disabled = false;
  @Input() required = false;
  @Input() placeholder = 'Seleccione hora';
  
  horas: number[] = Array.from({ length: 12 }, (_, i) => i + 1);
  minutos: string[] = ['00', '15', '30', '45'];
  periodos: string[] = ['AM', 'PM'];
  
  hora: number = 8;
  minuto: string = '00';
  periodo: string = 'AM';
  
  private onChange: any = () => {};
  private onTouched: any = () => {};

  ngOnInit(): void {
    this.emitValue();
  }

  writeValue(value: string): void {
    if (value) {
      const [time, periodo] = value.split(' ');
      const [hora, minuto] = time.split(':');
      this.hora = parseInt(hora);
      this.minuto = minuto;
      this.periodo = periodo;
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onHoraChange(): void {
    this.emitValue();
  }

  onMinutoChange(): void {
    this.emitValue();
  }

  onPeriodoChange(): void {
    this.emitValue();
  }

  private emitValue(): void {
    const horaStr = this.hora.toString().padStart(2, '0');
    const valor = `${horaStr}:${this.minuto} ${this.periodo}`;
    this.onChange(valor);
    this.onTouched();
  }

  onBlur(): void {
    this.onTouched();
  }
}