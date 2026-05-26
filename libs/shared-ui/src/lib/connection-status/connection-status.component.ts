import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type ConnectionState = 'connected' | 'connecting' | 'disconnected';

@Component({
  selector: 'tp-connection-status',
  imports: [],
  templateUrl: './connection-status.component.html',
  styleUrl: './connection-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectionStatusComponent {
  @Input() state: ConnectionState | null = 'connecting';

  get label(): string {
    switch (this.state) {
      case 'connected':
        return 'Online';
      case 'disconnected':
        return 'Reconectando';
      default:
        return 'Conectando';
    }
  }
}
