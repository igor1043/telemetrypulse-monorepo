import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

@Component({
  selector: 'tp-ford-search-input',
  imports: [],
  templateUrl: './ford-search-input.component.html',
  styleUrl: './ford-search-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FordSearchInputComponent {
  @Input() label = 'Buscar';
  @Input() placeholder = '';
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();

  updateValue(value: string): void {
    this.valueChange.emit(value);
  }

  clear(): void {
    this.valueChange.emit('');
  }
}
