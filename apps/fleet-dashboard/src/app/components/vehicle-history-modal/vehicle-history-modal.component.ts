import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { TelemetryReading } from '@telemetrypulse-monorepo/shared-contracts';

export interface VehicleHistoryModalState {
  error: string | null;
  isLoading: boolean;
  isOpen: boolean;
  readings: TelemetryReading[];
  vehicleId: string | null;
}

@Component({
  selector: 'tp-vehicle-history-modal',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './vehicle-history-modal.component.html',
  styleUrl: './vehicle-history-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleHistoryModalComponent {
  @Input({ required: true }) state!: VehicleHistoryModalState;
  @Output() closed = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }
}
