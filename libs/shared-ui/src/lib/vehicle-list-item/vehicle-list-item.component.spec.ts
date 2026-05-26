import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VehicleStatus } from '@telemetrypulse-monorepo/shared-contracts';
import { vi } from 'vitest';
import { VehicleListItemComponent } from './vehicle-list-item.component';

const vehicle: VehicleStatus = {
  vehicleId: 'EVT-001',
  model: 'Ford E-Transit',
  imageUrl: '/vehicles/sedan-silver.png',
  status: 'MOVING',
  batteryLevel: 72,
  speedKmh: 48,
  motorTemperatureCelsius: 64,
  latitude: -23.5505,
  longitude: -46.6333,
  lastUpdatedAt: new Date().toISOString(),
};

describe('VehicleListItemComponent', () => {
  let fixture: ComponentFixture<VehicleListItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehicleListItemComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VehicleListItemComponent);
    fixture.componentInstance.vehicle = vehicle;
  });

  it('emits the vehicle id when selected', () => {
    const spy = vi.spyOn(fixture.componentInstance.selectedVehicle, 'emit');

    fixture.componentInstance.selectVehicle();

    expect(spy).toHaveBeenCalledWith('EVT-001');
  });

  it.each([
    { batteryLevel: 14.9, expectedClass: 'critical' },
    { batteryLevel: 34.9, expectedClass: 'warning' },
    { batteryLevel: 35, expectedClass: 'healthy' },
  ])(
    'maps $batteryLevel battery level to $expectedClass visual state',
    ({ batteryLevel, expectedClass }) => {
      fixture.componentInstance.vehicle = {
        ...vehicle,
        batteryLevel,
      };

      expect(fixture.componentInstance.batteryClass).toBe(expectedClass);
    },
  );

  it('translates vehicle statuses to Portuguese labels', () => {
    fixture.componentInstance.vehicle = {
      ...vehicle,
      status: 'IDLE',
    };

    expect(fixture.componentInstance.statusLabel).toBe('Parado');
  });
});
