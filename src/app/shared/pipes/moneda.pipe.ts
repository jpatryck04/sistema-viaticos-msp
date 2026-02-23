import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'moneda',
  standalone: true
})
export class MonedaPipe implements PipeTransform {
  transform(value: number | null | undefined, symbol: boolean = true): string {
    if (value === null || value === undefined) return '';
    
    const formatter = new Intl.NumberFormat('es-DO', {
      style: symbol ? 'currency' : 'decimal',
      currency: 'DOP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    return formatter.format(value);
  }
}