import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AreasService } from '../services/areas.service';
import { NotificationService } from '@core/services/notification.service';
import {
  GeoJSONFeatureCollection,
  AreaImportResponse,
  AreaImportStatus,
  ImportStatus,
} from '../models/area.model';
import { catchError, interval, of, Subject, switchMap, takeUntil, takeWhile } from 'rxjs';
import * as L from 'leaflet';

@Component({
  selector: 'app-project-map',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatCardModule,
    MatTooltipModule,
  ],
  templateUrl: './project-map.component.html',
  styleUrl: './project-map.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectMapComponent implements AfterViewInit, OnDestroy {
  private areasService = inject(AreasService);
  private notification = inject(NotificationService);
  private destroy$ = new Subject<void>();

  private resizeObserver: ResizeObserver | null = null;
  private pendingInitTimer: number | null = null;

  projectId = input.required<string>();
  projectName = input.required<string>();
  canEditMap = input(false);

  mapLoaded = output<GeoJSONFeatureCollection>();

  private mapContainerRef?: ElementRef<HTMLDivElement>;

  @ViewChild('mapContainer', { static: false })
  set mapContainer(value: ElementRef<HTMLDivElement> | undefined) {
    this.mapContainerRef = value;

    if (value && this.hasMap() && this.currentGeoJSON()) {
      this.scheduleInitializeMap();
    }
  }

  private map: L.Map | null = null;
  private geoJsonLayer: L.GeoJSON | null = null;
  private areaLabelsLayer: L.LayerGroup | null = null;
  private inventoryStageLayer: L.LayerGroup | null = null;

  hasMap = signal(false);
  loadingMap = signal(true);
  currentGeoJSON = signal<GeoJSONFeatureCollection | null>(null);
  isMapFullscreen = signal(false);

  uploadingFile = signal(false);
  uploadProgress = signal(0);
  importStatus = signal<ImportStatus | null>(null);
  currentImportId = signal<string | null>(null);
  uploadError = signal<string | null>(null);

  ngAfterViewInit(): void {
    this.checkForExistingMap();
  }

  ngOnDestroy(): void {
    this.destroyMap();
    this.destroy$.next();
    this.destroy$.complete();
  }

  checkForExistingMap(): void {
    this.loadingMap.set(true);
    this.areasService.getCurrentAreaGeoJSON(this.projectId()).subscribe({
      next: (geoJSON) => {
        if (geoJSON && geoJSON.features && geoJSON.features.length > 0) {
          this.hasMap.set(true);
          this.currentGeoJSON.set(geoJSON);
          this.mapLoaded.emit(geoJSON);
          this.scheduleInitializeMap();
        } else {
          this.hasMap.set(false);
        }
        this.loadingMap.set(false);
      },
      error: (error) => {
        if (error.status === 404) {
          this.hasMap.set(false);
        } else {
          console.error('Error checking for map:', error);
        }
        this.loadingMap.set(false);
      },
    });
  }

  private scheduleInitializeMap(attempt = 0): void {
    const maxAttempts = 120; // ~6s

    if (this.pendingInitTimer !== null) {
      window.clearTimeout(this.pendingInitTimer);
      this.pendingInitTimer = null;
    }

    this.pendingInitTimer = window.setTimeout(() => {
      this.pendingInitTimer = null;

      const geoJSON = this.currentGeoJSON();
      const container = this.mapContainerRef?.nativeElement;

      if (!geoJSON || !container) {
        if (attempt < maxAttempts) {
          this.scheduleInitializeMap(attempt + 1);
        }
        return;
      }

      const hasSize = container.offsetWidth > 0 && container.offsetHeight > 0;
      if (!hasSize && attempt < maxAttempts) {
        this.scheduleInitializeMap(attempt + 1);
        return;
      }

      this.initializeMap();
    }, 50);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (!files || files.length === 0) {
      return;
    }

    const fileArray = Array.from(files);

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
        `Formato no soportado: ${invalidFiles.join(', ')}. ` +
          'Formatos permitidos: ZIP, RAR, Shapefiles, GeoJSON, KML',
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
    const name = `Importación de mapa para proyecto ${this.projectName()}`;
    const source = 'GPS';

    this.uploadingFile.set(true);
    this.uploadProgress.set(0);
    this.uploadError.set(null);
    this.importStatus.set(ImportStatus.PENDING);

    this.areasService.importAreaFiles(this.projectId(), files, name, source).subscribe({
      next: (response: AreaImportResponse) => {
        this.currentImportId.set(response.importId);
        this.notification.success('Archivo enviado. Procesando...');
        this.startPollingImportStatus(response.importId);
      },
      error: (error) => {
        console.error('Error uploading shapefile:', error);
        this.uploadingFile.set(false);
        this.uploadError.set('Error al subir el archivo. Intenta nuevamente.');
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
          const hasTimeout = Date.now() - startTime > maxDuration;

          if (hasTimeout) {
            this.handleTimeout();
            return false;
          }

          return isProcessing;
        }, true),
        catchError((error) => {
          console.error('Error polling import status:', error);
          this.handlePollingError();
          return of(null);
        }),
      )
      .subscribe({
        next: (status: AreaImportStatus | null) => {
          if (!status) return;

          this.importStatus.set(status.status);

          if (status.status === ImportStatus.PROCESSING) {
            const progress = status.featuresImported / Math.max(status.featuresCount, 1);
            this.uploadProgress.set(Math.round(progress * 100));
          }

          if (status.status === ImportStatus.COMPLETED) {
            this.handleImportSuccess();
          } else if (status.status === ImportStatus.FAILED) {
            this.handleImportFailure(status.errors);
          }
        },
      });
  }

  private handleImportSuccess(): void {
    this.uploadingFile.set(false);
    this.uploadProgress.set(100);
    this.notification.success('¡Mapa cargado exitosamente!');

    setTimeout(() => {
      this.checkForExistingMap();
      this.resetUploadState();
    }, 1500);
  }

  private handleImportFailure(errors: string[] | null): void {
    this.uploadingFile.set(false);
    const errorMessage =
      errors && errors.length > 0 ? errors.join(', ') : 'Error al procesar el shapefile';
    this.uploadError.set(errorMessage);
    this.notification.error('Error al procesar el archivo');
  }

  private handleTimeout(): void {
    this.uploadingFile.set(false);
    this.uploadError.set(
      'El procesamiento está tomando más tiempo del esperado. Por favor, recarga la página.',
    );
    this.notification.warning('Procesamiento en curso. Recarga la página en unos minutos.');
  }

  private handlePollingError(): void {
    this.uploadingFile.set(false);
    this.uploadError.set('Error al verificar el estado de la importación');
    this.notification.error('Error al verificar el estado del archivo');
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('project-map-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  retryUpload(): void {
    this.resetUploadState();
    const fileInput = document.getElementById('project-map-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
      fileInput.click();
    }
  }

  private resetUploadState(): void {
    this.uploadingFile.set(false);
    this.uploadProgress.set(0);
    this.importStatus.set(null);
    this.currentImportId.set(null);
    this.uploadError.set(null);
  }

  private initializeMap(): void {
    const geoJSON = this.currentGeoJSON();
    if (!geoJSON || !this.mapContainerRef) {
      return;
    }

    this.destroyMap();

    try {
      const iconRetinaUrl = '/marker-icon-2x.png';
      const iconUrl = '/marker-icon.png';
      const shadowUrl = '/marker-shadow.png';
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

      this.map = L.map(this.mapContainerRef.nativeElement, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: false,
        doubleClickZoom: true,
        touchZoom: true,
        dragging: true,
        boxZoom: true,
        keyboard: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(this.map);

      this.geoJsonLayer = L.geoJSON(geoJSON as GeoJSON.GeoJsonObject, {
        style: {
          color: '#218358',
          weight: 3,
          opacity: 0.8,
          fillColor: '#218358',
          fillOpacity: 0.2,
        },
        onEachFeature: (feature: GeoJSON.Feature, layer: L.Layer) => {
          if (feature.properties) {
            const popupContent = this.buildPopupContent(feature.properties);
            (layer as L.Path).bindPopup(popupContent);
            this.addAreaLabel(feature);
            // this.addInventoryStageIcon(feature, popupContent);
          }
        },
      }).addTo(this.map);

      this.setupResizeObserver();
      this.invalidateAndFitToGeoJson();
    } catch (error) {
      console.error('Error initializing map:', error);
      this.notification.error('Error al inicializar el mapa');
    }
  }

  private invalidateAndFitToGeoJson(): void {
    // Problema típico: el mapa se inicializa cuando el contenedor aún no tiene tamaño final.
    // Esto causa tiles/layers “en blanco” hasta un refresh y/o un zoom demasiado alejado.
    window.setTimeout(() => {
      if (!this.map) return;

      this.map.invalidateSize();

      const bounds = this.geoJsonLayer?.getBounds();
      if (bounds && bounds.isValid()) {
        this.map.fitBounds(bounds, {
          padding: [24, 24],
          maxZoom: 17,
          animate: false,
        });
      }
    }, 0);

    window.setTimeout(() => {
      if (!this.map) return;

      this.map.invalidateSize();

      const bounds = this.geoJsonLayer?.getBounds();
      if (bounds && bounds.isValid()) {
        this.map.fitBounds(bounds, {
          padding: [24, 24],
          maxZoom: 17,
          animate: false,
        });
      }
    }, 250);
  }

  private setupResizeObserver(): void {
    const container = this.mapContainerRef?.nativeElement;
    if (!container) return;

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.resizeObserver = new ResizeObserver(() => {
      // Mantener el mapa “responsive” cuando cambie el layout.
      // Importante para el primer render y también cuando cambian columnas/tamaños.
      if (this.map) {
        this.map.invalidateSize();
      }
    });

    this.resizeObserver.observe(container);
  }

  private destroyMap(): void {
    if (this.pendingInitTimer !== null) {
      window.clearTimeout(this.pendingInitTimer);
      this.pendingInitTimer = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.areaLabelsLayer) {
      this.areaLabelsLayer.clearLayers();
      this.areaLabelsLayer = null;
    }
    if (this.inventoryStageLayer) {
      this.inventoryStageLayer.clearLayers();
      this.inventoryStageLayer = null;
    }
    if (this.geoJsonLayer) {
      this.geoJsonLayer.remove();
      this.geoJsonLayer = null;
    }
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private addAreaLabel(feature: GeoJSON.Feature): void {
    if (!this.map || !feature.properties) return;

    const areaNumber = this.getAreaNumber(feature.properties);

    if (areaNumber) {
      const centroid = this.getCentroid(feature);

      if (centroid) {
        const labelIcon = L.divIcon({
          className: 'area-label',
          html: `<div class="area-number">${areaNumber}</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        const labelMarker = L.marker(centroid, { icon: labelIcon });

        if (!this.areaLabelsLayer) {
          this.areaLabelsLayer = L.layerGroup().addTo(this.map);
        }
        this.areaLabelsLayer.addLayer(labelMarker);
      }
    }
  }

  private addInventoryStageIcon(feature: GeoJSON.Feature, popupContent: string): void {
    if (!this.map || !feature.properties) return;

    const projectStage = feature.properties['project_stage'];
    if (typeof projectStage !== 'string' || projectStage.trim().toLowerCase() !== 'inventory') {
      return;
    }

    const center = this.getFeatureCenter(feature);
    if (!center) {
      return;
    }

    const inventoryIcon = L.divIcon({
      className: 'inventory-stage-label',
      html: '<div class="inventory-stage-icon" title="Etapa inventory">🌳</div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    const marker = L.marker(center, { icon: inventoryIcon });
    marker.bindPopup(popupContent);

    if (!this.inventoryStageLayer) {
      this.inventoryStageLayer = L.layerGroup().addTo(this.map);
    }

    this.inventoryStageLayer.addLayer(marker);
  }

  private buildPopupContent(properties: Record<string, unknown>): string {
    return Object.entries(properties)
      .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
      .join('<br>');
  }

  private getAreaNumber(properties: Record<string, unknown>): string | null {
    const possibleKeys = ['Numero'];

    for (const key of possibleKeys) {
      if (properties[key] !== undefined && properties[key] !== null) {
        return String(properties[key]);
      }
    }

    return null;
  }

  private getCentroid(feature: GeoJSON.Feature): L.LatLng | null {
    if (feature.geometry.type === 'Polygon') {
      const coordinates = feature.geometry.coordinates[0] as [number, number][];
      let latSum = 0;
      let lngSum = 0;
      let count = 0;

      coordinates.forEach((coord) => {
        lngSum += coord[0];
        latSum += coord[1];
        count++;
      });

      if (count > 0) {
        return L.latLng(latSum / count, lngSum / count);
      }
    }

    return null;
  }

  private getFeatureCenter(feature: GeoJSON.Feature): L.LatLng | null {
    if (!feature.geometry) {
      return null;
    }

    if (feature.geometry.type === 'Point') {
      const [lng, lat] = feature.geometry.coordinates as [number, number];
      return L.latLng(lat, lng);
    }

    const tempLayer = L.geoJSON(feature as GeoJSON.GeoJsonObject);
    const bounds = tempLayer.getBounds();

    if (bounds.isValid()) {
      return bounds.getCenter();
    }

    return null;
  }

  enableEditMode(): void {
    this.hasMap.set(false);
    this.currentGeoJSON.set(null);
    this.destroyMap();
  }

  toggleMapFullscreen(): void {
    this.isMapFullscreen.update((current) => !current);
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
        const bounds = this.geoJsonLayer?.getBounds();
        if (bounds && bounds.isValid()) {
          this.map.fitBounds(bounds, {
            padding: [24, 24],
            maxZoom: 17,
            animate: false,
          });
        }
      }
    }, 100);
  }

  downloadGeoJSON(): void {
    this.notification.info('Descargando GeoJSON...');

    this.areasService.getCurrentAreaGeoJSON(this.projectId()).subscribe({
      next: (geoJSON) => {
        const dataStr = JSON.stringify(geoJSON, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        const timestamp = new Date().toISOString().split('T')[0];
        link.download = `${this.projectName().toLowerCase().replace(/\s+/g, '-')}_${timestamp}.geojson`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        this.notification.success('GeoJSON descargado correctamente');
      },
      error: (error) => {
        console.error('Error downloading GeoJSON:', error);
        this.notification.error('Error al descargar el GeoJSON');
      },
    });
  }
}
