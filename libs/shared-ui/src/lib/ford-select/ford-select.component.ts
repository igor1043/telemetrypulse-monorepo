import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

export interface FordSelectOption {
  label: string;
  value: string;
}

@Component({
  selector: 'tp-ford-select',
  imports: [],
  templateUrl: './ford-select.component.html',
  styleUrl: './ford-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FordSelectComponent {
  @Input() label = 'Selecionar';
  @Input() value = '';
  @Input() options: FordSelectOption[] = [];
  @Output() valueChange = new EventEmitter<string>();

  updateValue(value: string): void {
    this.valueChange.emit(value);
  }
}
