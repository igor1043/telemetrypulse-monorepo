import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import {
  VEHICLE_STATUS_LABELS,
  VehicleStatus,
} from '@telemetrypulse-monorepo/shared-contracts';

@Component({
  selector: 'tp-vehicle-list-item',
  imports: [CommonModule],
  templateUrl: './vehicle-list-item.component.html',
  styleUrl: './vehicle-list-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleListItemComponent {
  @Input({ required: true }) vehicle!: VehicleStatus;
  @Input() selected = false;
  @Output() selectedVehicle = new EventEmitter<string>();

  selectVehicle(): void {
    this.selectedVehicle.emit(this.vehicle.vehicleId);
  }

  get batteryClass(): string {
    if (this.vehicle.batteryLevel < 15) {
      return 'critical';
    }

    if (this.vehicle.batteryLevel < 35) {
      return 'warning';
    }

    return 'healthy';
  }

  get statusLabel(): string {
    return VEHICLE_STATUS_LABELS[this.vehicle.status];
  }
}
