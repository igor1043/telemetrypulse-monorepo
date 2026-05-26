import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {
  VEHICLE_STATUS_LABELS,
  VehicleStatus,
} from '@telemetrypulse-monorepo/shared-contracts';
import * as L from 'leaflet';
import type * as THREE from 'three';

interface VehicleRenderState {
  currentPoint: THREE.Vector2;
  fromPoint: THREE.Vector2;
  heading: number;
  model?: THREE.Group;
  targetPoint: THREE.Vector2;
  transitionStartedAt: number;
  vehicle: VehicleStatus;
}

interface PopupMetric {
  icon: string;
  label: string;
  value: string;
  variant?: 'gps';
}

@Component({
  selector: 'tp-fleet-map',
  imports: [],
  templateUrl: './fleet-map.component.html',
  styleUrl: './fleet-map.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FleetMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() vehicles: VehicleStatus[] = [];
  @Input() selectedVehicleId: string | null = null;
  @Input() selectionRevision = 0;
  @Input() suspend3dOverlay = false;
  @Output() vehicleSelected = new EventEmitter<string>();
  @ViewChild('mapHost', { static: true })
  private mapHost!: ElementRef<HTMLElement>;
  @ViewChild('carLayer', { static: true })
  private carLayer!: ElementRef<HTMLCanvasElement>;

  private map?: L.Map;
  private readonly markers = new Map<string, L.Marker>();
  private animationFrameId?: number;
  private camera?: THREE.OrthographicCamera;
  private carTemplate?: THREE.Group;
  private followSelectedVehicle = false;
  private isProgrammaticMapMove = false;
  private readonly modelOrientationDegrees = {
    x: -89,
    y: -154,
    z: 180,
  };
  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private three?: typeof import('three');
  private readonly vehicleRenderStates = new Map<string, VehicleRenderState>();
  private readonly transitionDurationMs = 4600;

  ngAfterViewInit(): void {
    this.map = L.map(this.mapHost.nativeElement, {
      attributionControl: false,
      zoomControl: false,
    }).setView([-23.5505, -46.6333], 12);
    this.map.getContainer().appendChild(this.carLayer.nativeElement);
    this.update3DOverlayVisibility();

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    L.control
      .attribution({ prefix: '' })
      .addAttribution('&copy; OpenStreetMap contributors')
      .addTo(this.map);

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 20,
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      },
    ).addTo(this.map);

    this.renderMarkers();
    void this.init3DLayer();
    this.bindMapRenderEvents();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) {
      return;
    }

    if (changes['vehicles']) {
      this.renderMarkers();
    }

    if (changes['suspend3dOverlay']) {
      this.update3DOverlayVisibility();
    }

    if (changes['selectedVehicleId']) {
      this.updateVehicleModelSelection();
    }

    if (
      changes['selectionRevision'] &&
      !changes['selectionRevision'].firstChange
    ) {
      this.followSelectedVehicle = true;
      this.focusSelectedVehicle({ openPopup: true });
    }
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.renderer?.dispose();
    this.map?.remove();
    this.markers.clear();
    this.vehicleRenderStates.clear();
  }

  private renderMarkers(): void {
    if (!this.map) {
      return;
    }

    const activeIds = new Set(
      this.vehicles.map((vehicle) => vehicle.vehicleId),
    );

    for (const [vehicleId, marker] of this.markers.entries()) {
      if (!activeIds.has(vehicleId)) {
        marker.remove();
        this.markers.delete(vehicleId);
        this.removeVehicleModel(vehicleId);
      }
    }

    const map = this.map;

    this.vehicles.forEach((vehicle) => {
      const position = L.latLng(vehicle.latitude, vehicle.longitude);
      const marker = this.markers.get(vehicle.vehicleId);

      if (marker) {
        marker.setLatLng(position);
        marker.setIcon(this.createVehicleIcon(vehicle));
        marker.setPopupContent(this.createPopup(vehicle));
      } else {
        const createdMarker = L.marker(position, {
          icon: this.createVehicleIcon(vehicle),
          riseOnHover: true,
        })
          .bindPopup(this.createPopup(vehicle), {
            autoPan: false,
            closeButton: false,
            keepInView: false,
            minWidth: 250,
          })
          .on('click', () => this.vehicleSelected.emit(vehicle.vehicleId))
          .addTo(map);

        this.markers.set(vehicle.vehicleId, createdMarker);
      }

      this.upsertVehicleModel(vehicle);
    });

    this.focusSelectedVehicle({ openPopup: false });
  }

  private focusSelectedVehicle(options: { openPopup: boolean }): void {
    if (
      !this.map ||
      !this.selectedVehicleId ||
      !this.followSelectedVehicle
    ) {
      return;
    }

    const vehicle = this.vehicles.find(
      (item) => item.vehicleId === this.selectedVehicleId,
    );
    const marker = this.markers.get(this.selectedVehicleId);

    if (!vehicle || !marker) {
      return;
    }

    const target = L.latLng(vehicle.latitude, vehicle.longitude);
    const targetZoom = Math.max(this.map.getZoom(), 14);

    this.map.stop();
    this.isProgrammaticMapMove = true;

    if (this.map.getZoom() < targetZoom) {
      this.map.flyTo(target, targetZoom, {
        animate: true,
        duration: 0.7,
      });
    } else {
      this.map.panTo(target, {
        animate: true,
        duration: 0.7,
      });
    }

    window.setTimeout(() => {
      this.isProgrammaticMapMove = false;
    }, 800);

    if (options.openPopup || marker.isPopupOpen()) {
      marker.openPopup();
    }
  }

  private createVehicleIcon(vehicle: VehicleStatus): L.DivIcon {
    const statusClass = vehicle.status.toLowerCase();
    const selectedClass =
      vehicle.vehicleId === this.selectedVehicleId ? ' selected' : '';

    return L.divIcon({
      className: `tp-vehicle-marker ${statusClass}${selectedClass}`,
      html: '<span class="tp-vehicle-marker__hitbox"></span>',
      iconAnchor: [32, 32],
      popupAnchor: [0, -32],
    });
  }

  private async init3DLayer(): Promise<void> {
    const [threeModule, loaderModule] = await Promise.all([
      import('three'),
      import('three/examples/jsm/loaders/GLTFLoader.js'),
    ]);
    this.three = threeModule;

    const canvas = this.carLayer.nativeElement;
    this.scene = new threeModule.Scene();
    this.camera = new threeModule.OrthographicCamera(0, 1, 1, 0, -1000, 1000);
    this.renderer = new threeModule.WebGLRenderer({
      alpha: true,
      antialias: true,
      canvas,
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.scene.add(new threeModule.AmbientLight(0xffffff, 1.8));

    const directionalLight = new threeModule.DirectionalLight(0xffffff, 2.2);
    directionalLight.position.set(120, -160, 260);
    this.scene.add(directionalLight);

    const loader = new loaderModule.GLTFLoader();
    loader.load('/models/car.glb', (gltf) => {
      this.carTemplate = gltf.scene as THREE.Group;
      this.normalizeCarTemplate(this.carTemplate);
      this.vehicles.forEach((vehicle) => this.upsertVehicleModel(vehicle));
      this.render3DFrame();
    });

    this.resize3DLayer();
    this.startAnimationLoop();
  }

  private bindMapRenderEvents(): void {
    this.map?.on('move zoom resize', () => {
      this.syncTargetsWithMap();
      this.resize3DLayer();
    });

    this.map?.on('dragstart', () => {
      if (!this.isProgrammaticMapMove) {
        this.followSelectedVehicle = false;
      }
    });

    this.map?.on('zoomend moveend', () => {
      this.syncTargetsWithMap();
      this.isProgrammaticMapMove = false;
    });
  }

  private startAnimationLoop(): void {
    const tick = () => {
      this.render3DFrame();
      this.animationFrameId = requestAnimationFrame(tick);
    };

    tick();
  }

  private upsertVehicleModel(vehicle: VehicleStatus): void {
    if (!this.map || !this.three) {
      return;
    }

    const targetPoint = this.toLayerPoint(vehicle);
    const existingState = this.vehicleRenderStates.get(vehicle.vehicleId);

    if (existingState) {
      existingState.vehicle = vehicle;
      existingState.fromPoint = existingState.currentPoint.clone();
      existingState.targetPoint = targetPoint;
      existingState.heading = this.calculateHeading(
        existingState.currentPoint,
        targetPoint,
        existingState.heading,
      );
      existingState.transitionStartedAt = performance.now();
      if (!existingState.model && this.carTemplate) {
        this.createVehicleModel(existingState);
      }
      this.updateSelectionScale(existingState);
      return;
    }

    const state: VehicleRenderState = {
      currentPoint: targetPoint.clone(),
      fromPoint: targetPoint.clone(),
      heading: -Math.PI / 2,
      targetPoint,
      transitionStartedAt: performance.now(),
      vehicle,
    };

    this.vehicleRenderStates.set(vehicle.vehicleId, state);
    this.createVehicleModel(state);
  }

  private createVehicleModel(state: VehicleRenderState): void {
    const THREE = this.three;

    if (!this.scene || !this.carTemplate || !THREE) {
      return;
    }

    const modelRoot = new THREE.Group();
    const model = this.carTemplate.clone(true);

    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = false;
        child.receiveShadow = false;

        if (child.material instanceof THREE.MeshStandardMaterial) {
          child.material = child.material.clone();
          child.material.metalness = Math.min(child.material.metalness + 0.1, 1);
          child.material.roughness = Math.max(child.material.roughness, 0.22);
        }
      }
    });

    modelRoot.add(model);
    state.model = modelRoot;
    this.updateSelectionScale(state);
    this.scene.add(modelRoot);
  }

  private removeVehicleModel(vehicleId: string): void {
    const state = this.vehicleRenderStates.get(vehicleId);

    if (state?.model) {
      this.scene?.remove(state.model);
    }

    this.vehicleRenderStates.delete(vehicleId);
  }

  private normalizeCarTemplate(template: THREE.Group): void {
    const THREE = this.three;

    if (!THREE) {
      return;
    }

    const box = new THREE.Box3().setFromObject(template);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const largestAxis = Math.max(size.x, size.y, size.z) || 1;

    template.position.sub(center);
    template.scale.multiplyScalar(52 / largestAxis);
    this.applyModelOrientation(template);
  }

  private applyModelOrientation(model: THREE.Object3D): void {
    const THREE = this.three;

    if (!THREE) {
      return;
    }

    model.rotation.set(
      THREE.MathUtils.degToRad(this.modelOrientationDegrees.x),
      THREE.MathUtils.degToRad(this.modelOrientationDegrees.y),
      THREE.MathUtils.degToRad(this.modelOrientationDegrees.z),
    );
  }

  private syncTargetsWithMap(): void {
    for (const state of this.vehicleRenderStates.values()) {
      const nextPoint = this.toLayerPoint(state.vehicle);
      state.currentPoint = nextPoint.clone();
      state.fromPoint = nextPoint.clone();
      state.targetPoint = nextPoint;
      state.transitionStartedAt = performance.now();
    }
  }

  private render3DFrame(): void {
    if (!this.renderer || !this.scene || !this.camera) {
      return;
    }

    if (this.suspend3dOverlay) {
      return;
    }

    this.resize3DLayer();
    const now = performance.now();

    for (const state of this.vehicleRenderStates.values()) {
      if (!state.model && this.carTemplate) {
        this.createVehicleModel(state);
      }

      if (!state.model) {
        continue;
      }

      const progress = Math.min(
        (now - state.transitionStartedAt) / this.transitionDurationMs,
        1,
      );
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      state.currentPoint = state.fromPoint
        .clone()
        .lerp(state.targetPoint, easedProgress);

      state.model.position.set(state.currentPoint.x, state.currentPoint.y, 0);
      state.model.rotation.z = state.heading;
    }

    this.renderer.render(this.scene, this.camera);
  }

  private resize3DLayer(): void {
    if (!this.renderer || !this.camera) {
      return;
    }

    const { clientHeight, clientWidth } = this.mapHost.nativeElement;

    if (!clientHeight || !clientWidth) {
      return;
    }

    this.renderer.setSize(clientWidth, clientHeight, false);
    this.camera.left = 0;
    this.camera.right = clientWidth;
    this.camera.top = 0;
    this.camera.bottom = clientHeight;
    this.camera.updateProjectionMatrix();
  }

  private toLayerPoint(vehicle: VehicleStatus): THREE.Vector2 {
    const THREE = this.three;
    const map = this.map;

    if (!THREE || !map) {
      throw new Error('Map and 3D renderer must be initialized before projecting vehicles.');
    }

    const point = map.latLngToContainerPoint([
      vehicle.latitude,
      vehicle.longitude,
    ]);

    return new THREE.Vector2(point.x, point.y);
  }

  private calculateHeading(
    fromPoint: THREE.Vector2,
    targetPoint: THREE.Vector2,
    fallback: number,
  ): number {
    const delta = targetPoint.clone().sub(fromPoint);

    if (delta.length() < 0.5) {
      return fallback;
    }

    return Math.atan2(delta.y, delta.x);
  }

  private updateSelectionScale(state: VehicleRenderState): void {
    if (!state.model) {
      return;
    }

    const isSelected = state.vehicle.vehicleId === this.selectedVehicleId;
    const statusScale = state.vehicle.status === 'OFFLINE' ? 0.86 : 1;
    const selectedScale = isSelected ? 1.22 : 1;

    state.model.scale.setScalar(statusScale * selectedScale);
  }

  private updateVehicleModelSelection(): void {
    for (const state of this.vehicleRenderStates.values()) {
      this.updateSelectionScale(state);
    }
  }

  private update3DOverlayVisibility(): void {
    if (!this.carLayer) {
      return;
    }

    this.carLayer.nativeElement.style.visibility = this.suspend3dOverlay
      ? 'hidden'
      : 'visible';
  }

  private createPopup(vehicle: VehicleStatus): string {
    const metrics: PopupMetric[] = [
      {
        icon: 'speed',
        label: 'Velocidade',
        value: `${Math.round(vehicle.speedKmh)} km/h`,
      },
      {
        icon: 'battery_4_bar',
        label: 'Bateria',
        value: `${Math.round(vehicle.batteryLevel)}%`,
      },
      {
        icon: 'device_thermostat',
        label: 'Temperatura',
        value: `${Math.round(vehicle.motorTemperatureCelsius)} C`,
      },
      {
        icon: 'my_location',
        label: 'GPS',
        value: `${vehicle.latitude.toFixed(5)}, ${vehicle.longitude.toFixed(5)}`,
        variant: 'gps',
      },
      {
        icon: 'schedule',
        label: 'Atualizado',
        value: this.formatLastUpdated(vehicle.lastUpdatedAt),
      },
      {
        icon: 'radio_button_checked',
        label: 'Status',
        value: VEHICLE_STATUS_LABELS[vehicle.status],
      },
    ];

    return `
      <article class="tp-map-popup">
        <header>
          <span class="material-symbols-rounded" aria-hidden="true">directions_car</span>
          <div>
            <strong>${escapeHtml(vehicle.model)}</strong>
            <span>${escapeHtml(vehicle.vehicleId)}</span>
          </div>
        </header>
        <dl class="tp-map-popup__metrics">
          ${metrics.map((metric) => this.createPopupMetric(metric)).join('')}
        </dl>
      </article>
    `;
  }

  private createPopupMetric(metric: PopupMetric): string {
    const variantClass = metric.variant
      ? ` tp-map-popup__metric--${metric.variant}`
      : '';

    return `
      <div class="tp-map-popup__metric${variantClass}">
        <span class="material-symbols-rounded" aria-hidden="true">${metric.icon}</span>
        <div>
          <dt>${escapeHtml(metric.label)}</dt>
          <dd>${escapeHtml(metric.value)}</dd>
        </div>
      </div>
    `;
  }

  private formatLastUpdated(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(value));
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return entities[char];
  });
}
