import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TelemetryReading } from '@telemetrypulse-monorepo/shared-contracts';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  VehicleHistoryModalComponent,
  VehicleHistoryModalState,
} from './vehicle-history-modal.component';

describe('VehicleHistoryModalComponent', () => {
  let fixture: ComponentFixture<VehicleHistoryModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehicleHistoryModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VehicleHistoryModalComponent);
  });

  it('does not render content when closed', () => {
    fixture.componentInstance.state = state({ isOpen: false });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('renders history readings when open', () => {
    fixture.componentInstance.state = state({
      isOpen: true,
      readings: [reading({ vehicleId: 'EVT-001', speedKmh: 72 })],
      vehicleId: 'EVT-001',
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')?.textContent).toContain('EVT-001');
    expect(compiled.textContent).toContain('72');
    expect(compiled.textContent).toContain('-23.55050');
  });

  it('emits close events from the close button', () => {
    fixture.componentInstance.state = state({ isOpen: true });
    const spy = vi.spyOn(fixture.componentInstance.closed, 'emit');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      '.history-modal__close',
    ) as HTMLButtonElement;
    button.click();

    expect(spy).toHaveBeenCalledOnce();
  });
});

function state(
  overrides: Partial<VehicleHistoryModalState> = {},
): VehicleHistoryModalState {
  return {
    error: null,
    isLoading: false,
    isOpen: true,
    readings: [],
    vehicleId: 'EVT-001',
    ...overrides,
  };
}

function reading(overrides: Partial<TelemetryReading> = {}): TelemetryReading {
  return {
    vehicleId: 'EVT-001',
    batteryLevel: 80,
    speedKmh: 48,
    motorTemperatureCelsius: 62,
    latitude: -23.5505,
    longitude: -46.6333,
    recordedAt: '2026-05-25T12:00:00Z',
    ...overrides,
  };
}
