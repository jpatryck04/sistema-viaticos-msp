import { Directive, ElementRef, HostListener, Input } from '@angular/core';

@Directive({
  selector: '[appSoloNumeros]',
  standalone: true
})
export class SoloNumerosDirective {
  @Input() appSoloNumeros: boolean = true;
  @Input() allowDecimal: boolean = false;

  private regex: RegExp;
  private specialKeys: string[] = ['Backspace', 'Tab', 'End', 'Home', 'ArrowLeft', 'ArrowRight', 'Delete'];

  constructor(private el: ElementRef) {
    this.regex = this.allowDecimal ? /^[0-9]*\.?[0-9]*$/ : /^[0-9]*$/;
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (!this.appSoloNumeros) return;

    if (this.specialKeys.indexOf(event.key) !== -1) {
      return;
    }

    const current: string = this.el.nativeElement.value;
    const next: string = current.concat(event.key);
    
    if (next && !String(next).match(this.regex)) {
      event.preventDefault();
    }
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    if (!this.appSoloNumeros) return;

    event.preventDefault();
    const pastedInput: string = event.clipboardData?.getData('text/plain') || '';
    
    if (pastedInput.match(this.regex)) {
      document.execCommand('insertText', false, pastedInput);
    }
  }
}