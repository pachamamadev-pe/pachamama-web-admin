import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AreasService } from '../services/areas.service';
import { ProjectsService } from '../services/projects.service';
import { NotificationService } from '@core/services/notification.service';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import {
  GeoJSONFeatureCollection,
  GeoJSONFeature,
  AreaImportResponse,
  AreaImportStatus,
  ImportStatus,
} from '../models/area.model';
import { Project } from '../models/project.model';
import { interval, Subject } from 'rxjs';
import { switchMap, takeUntil, takeWhile } from 'rxjs/operators';
import * as L from 'leaflet';

@Component({
  selector: 'app-project-map-management',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: './project-map-management.page.html',
  styleUrl: './project-map-management.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectMapManagementPage implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private areasService = inject(AreasService);
  private projectsService = inject(ProjectsService);
  private notification = inject(NotificationService);
  private dialog = inject(MatDialog);

  projectId = signal<string>('');
  project = signal<Project | null>(null);

  loading = signal(true);
  geoJsonData = signal<GeoJSONFeatureCollection | null>(null);
  features = signal<GeoJSONFeature[]>([]);
  hiddenFeatureIds = signal<Set<string>>(new Set());

  // Leaflet map elements
  @ViewChild('mapContainer') mapContainerRef!: ElementRef<HTMLDivElement>;
  private map: L.Map | null = null;
  private geoJsonLayer: L.GeoJSON | null = null;

  // Upload state
  uploadingFile = signal(false);
  uploadProgress = signal(0);
  private destroy$ = new Subject<void>();

  canEdit = computed(() => {
    return this.project()?.stage === 'planning';
  });

  visibleFeatures = computed(() => {
    return this.features().filter((f) => !this.hiddenFeatureIds().has(f.id));
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.projectId.set(id);
      this.loadProjectDetails();
      this.loadMapData();
    }
  }

  private loadProjectDetails() {
    this.projectsService.getProjectById(this.projectId()).subscribe({
      next: (project) => {
        this.project.set(project);
      },
      error: () => {
        this.notification.error('Error al cargar el proyecto');
      },
    });
  }

  private loadMapData() {
    this.loading.set(true);
    this.areasService.getCurrentAreaGeoJSON(this.projectId()).subscribe({
      next: (data) => {
        this.geoJsonData.set(data);
        this.features.set(data.features || []);
        this.hiddenFeatureIds.set(new Set()); // Reset hidden features
        this.loading.set(false);
        setTimeout(() => this.initializeMap(), 100);
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status !== 404) {
          // Ignore 404 meaning no map exists yet
          this.notification.error('Error al cargar datos del mapa');
        }
      },
    });
  }

  private initializeMap() {
    if (!this.mapContainerRef) return;

    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    const container = this.mapContainerRef.nativeElement;

    // Fix leaflef icon issues
    const iconRetinaUrl = 'assets/marker-icon-2x.png';
    const iconUrl = 'assets/marker-icon.png';
    const shadowUrl = 'assets/marker-shadow.png';
    const iconDefault = L.icon({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41],
    });
    L.Marker.prototype.options.icon = iconDefault;

    this.map = L.map(container, {
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);

    this.renderMapFeatures();

    // Map resize issue fix
    setTimeout(() => {
      this.map?.invalidateSize();
      if (this.geoJsonLayer && this.geoJsonLayer.getBounds().isValid()) {
        this.map?.fitBounds(this.geoJsonLayer.getBounds());
      }
    }, 200);
  }

  private renderMapFeatures() {
    if (!this.map || !this.geoJsonData()) return;

    if (this.geoJsonLayer) {
      this.map.removeLayer(this.geoJsonLayer);
    }

    // Filter features based on hidden IDs
    const currentHidden = this.hiddenFeatureIds();
    const visibleData: GeoJSONFeatureCollection = {
      type: 'FeatureCollection',
      features: this.geoJsonData()!.features.filter((f) => !currentHidden.has(f.id)),
    };

    if (visibleData.features.length === 0) return;

    this.geoJsonLayer = L.geoJSON(visibleData as GeoJSON.GeoJsonObject, {
      style: {
        color: '#218358',
        weight: 3,
        opacity: 0.8,
        fillColor: '#218358',
        fillOpacity: 0.2,
      },
      pointToLayer: (feature, latlng) => {
        const dotIcon = L.divIcon({
          className: '',
          html: '<div style="width:12px;height:12px;border-radius:50%;background:#218358;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>',
          iconSize: [12, 12],
          iconAnchor: [6, 6],
          popupAnchor: [0, -10],
        });
        return L.marker(latlng, { icon: dotIcon });
      },
      onEachFeature: (feature: GeoJSON.Feature, layer: L.Layer) => {
        if (feature.properties) {
          const name = feature.properties['name'] || 'Área';
          const code = feature.properties['code'] || '';

          const popupContent = `
            <div class="p-2">
              <h3 class="font-bold text-lg m-0">${name}</h3>
              ${code ? `<p class="text-sm text-gray-500 m-0 mt-1">${code}</p>` : ''}
            </div>
          `;
          layer.bindPopup(popupContent);
        }
      },
    }).addTo(this.map);
  }

  toggleFeatureVisibility(featureId: string) {
    // We get checkbox change event or toggle
    const hiddenSet = new Set(this.hiddenFeatureIds());
    if (hiddenSet.has(featureId)) {
      hiddenSet.delete(featureId);
    } else {
      hiddenSet.add(featureId);
    }
    this.hiddenFeatureIds.set(hiddenSet);
    this.renderMapFeatures(); // Re-render without reloading from server
  }

  isFeatureVisible(featureId: string): boolean {
    return !this.hiddenFeatureIds().has(featureId);
  }

  deleteFeature(feature: GeoJSONFeature, event: Event) {
    event.stopPropagation();

    if (!this.canEdit()) {
      this.notification.warning('Solo se pueden eliminar áreas durante la etapa de Planificación.');
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '¿Eliminar área?',
        message: `Esta acción eliminará el área "${feature.properties['name'] || 'sin nombre'}" permanentemente.`,
        confirmText: 'Eliminar',
        type: 'danger',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.loading.set(true);
        this.areasService.deleteFeature(this.projectId(), feature.id).subscribe({
          next: () => {
            this.notification.success('Área eliminada correctamente');
            this.loadMapData(); // Reload map after delete
          },
          error: () => {
            this.loading.set(false);
            this.notification.error('Error al eliminar el área');
          },
        });
      }
    });
  }

  deleteAllFeatures() {
    if (!this.canEdit()) {
      this.notification.warning('Solo se pueden eliminar áreas durante la etapa de Planificación.');
      return;
    }

    if (this.features().length === 0) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '¿Eliminar todos los features?',
        message: `Esta acción eliminará TODAS las áreas actuales del proyecto permanentemente. No se puede deshacer.`,
        confirmText: 'Eliminar Todos',
        type: 'danger',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.loading.set(true);
        this.areasService.deleteAllFeatures(this.projectId()).subscribe({
          next: () => {
            this.notification.success('Todas las áreas fueron eliminadas');
            this.loadMapData();
          },
          error: () => {
            this.loading.set(false);
            this.notification.error('Error al eliminar las áreas');
          },
        });
      }
    });
  }

  goBack() {
    this.router.navigate(['/projects', this.projectId()]);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (!files || files.length === 0) {
      return;
    }

    const fileArray = Array.from(files);

    // Extensions verification
    const allowedExtensions = [
      '.zip',
      '.rar',
      '.shp',
      '.dbf',
      '.shx',
      '.prj',
      '.cpg',
      '.qmd',
      '.sbn',
      '.sbx',
      '.xml',
      '.shp.xml',
      '.geojson',
      '.json',
      '.kml',
    ];

    const invalidFiles: string[] = [];
    const oversizedFiles: string[] = [];
    const maxSize = 150 * 1024 * 1024;

    for (const file of fileArray) {
      const fileName = file.name.toLowerCase();
      const isValid = allowedExtensions.some((ext) => fileName.endsWith(ext));

      if (!isValid) {
        invalidFiles.push(file.name);
        continue;
      }

      if (file.size > maxSize) {
        oversizedFiles.push(file.name);
      }
    }

    if (invalidFiles.length > 0) {
      this.notification.error(
        `Formato no soportado: ${invalidFiles.join(', ')}. Formatos permitidos: ZIP, RAR, Shapefiles, GeoJSON, KML`,
      );
      input.value = '';
      return;
    }

    if (oversizedFiles.length > 0) {
      this.notification.error(
        `Archivos demasiado grandes (máximo 150MB): ${oversizedFiles.join(', ')}`,
      );
      input.value = '';
      return;
    }

    this.uploadFiles(fileArray);
    input.value = '';
  }

  private uploadFiles(files: File[]): void {
    const name = `Importación de mapa o capa para proyecto ${this.project()?.name || this.projectId()}`;
    const source = 'GPS';

    this.uploadingFile.set(true);
    this.uploadProgress.set(0);

    this.areasService.importAreaFiles(this.projectId(), files, name, source).subscribe({
      next: (response: AreaImportResponse) => {
        this.notification.success('Archivo enviado. Procesando...');
        this.startPollingImportStatus(response.importId);
      },
      error: (error) => {
        console.error('Error uploading file:', error);
        this.uploadingFile.set(false);
        this.notification.error('Error al subir el archivo');
      },
    });
  }

  private startPollingImportStatus(importId: string): void {
    const pollingInterval = 2000;
    const maxDuration = 5 * 60 * 1000;
    const startTime = Date.now();

    interval(pollingInterval)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.areasService.getImportStatus(this.projectId(), importId)),
        takeWhile((status: AreaImportStatus) => {
          const isProcessing =
            status.status === ImportStatus.PENDING || status.status === ImportStatus.PROCESSING;
          const isTimeExceeded = Date.now() - startTime > maxDuration;

          if (isTimeExceeded && isProcessing) {
            this.uploadingFile.set(false);
            this.notification.error('La importación excedió el tiempo máximo (5 minutos)');
            return false;
          }

          return isProcessing;
        }, true),
      )
      .subscribe({
        next: (status: AreaImportStatus) => {
          if (status.status === ImportStatus.COMPLETED) {
            this.uploadingFile.set(false);
            this.notification.success('Mapa procesado y guardado correctamente');
            this.loadMapData();
          } else if (status.status === ImportStatus.FAILED) {
            this.uploadingFile.set(false);
            this.notification.error(
              `Error al procesar el archivo: ${status.errors || 'Error desconocido'}`,
            );
          }
        },
        error: (error) => {
          console.error('Error polling status:', error);
          this.uploadingFile.set(false);
          this.notification.error('Error al verificar el estado de la importación');
        },
      });
  }
}
