import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConnectionStatusComponent } from './connection-status.component';

describe('ConnectionStatusComponent', () => {
  let fixture: ComponentFixture<ConnectionStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConnectionStatusComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ConnectionStatusComponent);
  });

  it.each([
    { expectedLabel: 'Conectando', state: 'connecting' as const },
    { expectedLabel: 'Online', state: 'connected' as const },
    { expectedLabel: 'Reconectando', state: 'disconnected' as const },
  ])('renders the $expectedLabel label', async ({ expectedLabel, state }) => {
    fixture.componentInstance.state = state;
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain(expectedLabel);
  });
});
