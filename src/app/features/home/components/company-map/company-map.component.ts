import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationService } from '@core/services/notification.service';
import { DashboardService } from '../../services/dashboard.service';
import { Subject, takeUntil } from 'rxjs';
import type { FeatureCollection } from 'geojson';
import * as L from 'leaflet';

@Component({
  selector: 'app-company-map',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './company-map.component.html',
  styleUrl: './company-map.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyMapComponent implements AfterViewInit, OnDestroy {
  private dashboardService = inject(DashboardService);
  private notification = inject(NotificationService);
  private destroy$ = new Subject<void>();

  private resizeObserver: ResizeObserver | null = null;
  private pendingInitTimer: number | null = null;

  private mapContainerRef?: ElementRef<HTMLDivElement>;

  @ViewChild('mapContainer', { static: false })
  set mapContainer(value: ElementRef<HTMLDivElement> | undefined) {
    if (value && value !== this.mapContainerRef) {
      this.mapContainerRef = value;
      // Esperar al siguiente tick para que el DOM tenga dimensiones reales
      window.setTimeout(() => {
        if (this.hasMap() && this.currentGeoJSON()) {
          this.scheduleInitializeMap();
        }
      }, 0);
    } else {
      this.mapContainerRef = value;
    }
  }

  private map: L.Map | null = null;
  private geoJsonLayer: L.GeoJSON | null = null;

  hasMap = signal(false);
  loadingMap = signal(true);
  currentGeoJSON = signal<FeatureCollection | null>(null);
  isMapFullscreen = signal(false);
  mapError = signal<string | null>(null);

  ngAfterViewInit(): void {
    this.loadCompanyMap();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.pendingInitTimer !== null) {
      window.clearTimeout(this.pendingInitTimer);
    }

    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  loadCompanyMap(): void {
    this.loadingMap.set(true);
    this.mapError.set(null);

    // Limpiar mapa anterior si existe
    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    this.dashboardService
      .getCompanyGeoJson()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (geoJson) => {
          if (geoJson && geoJson.features && geoJson.features.length > 0) {
            this.currentGeoJSON.set(geoJson);
            this.hasMap.set(true);
            // Esperar a que Angular renderice #mapContainer en el DOM
            window.setTimeout(() => this.scheduleInitializeMap(), 50);
          } else {
            this.hasMap.set(false);
          }
          this.loadingMap.set(false);
        },
        error: (error) => {
          console.error('Error loading company map:', error);
          if (error.status === 404) {
            this.hasMap.set(false);
          } else {
            this.mapError.set('No se pudo cargar el mapa.');
            this.notification.error('Error al cargar el mapa de la empresa');
          }
          this.loadingMap.set(false);
        },
      });
  }

  private scheduleInitializeMap(): void {
    if (this.pendingInitTimer !== null) {
      window.clearTimeout(this.pendingInitTimer);
    }

    this.pendingInitTimer = window.setTimeout(() => {
      this.initializeMap();
    }, 100);
  }

  private initializeMap(): void {
    if (!this.mapContainerRef?.nativeElement) return;

    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    try {
      const dotIcon = L.divIcon({
        className: '',
        html: '<div style="width:12px;height:12px;border-radius:50%;background:#218358;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
        popupAnchor: [0, -10],
      });
      L.Marker.prototype.options.icon = dotIcon;

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

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(this.map);

      this.renderGeoJson();

      this.resizeObserver = new ResizeObserver(() => {
        if (this.map) {
          this.map.invalidateSize();
        }
      });
      this.resizeObserver.observe(this.mapContainerRef.nativeElement);
    } catch (e) {
      console.error('Error initializing map:', e);
    }
  }

  private renderGeoJson(): void {
    if (!this.map || !this.currentGeoJSON()) return;

    if (this.geoJsonLayer) {
      this.map.removeLayer(this.geoJsonLayer);
    }

    const mapData = this.currentGeoJSON();

    try {
      this.geoJsonLayer = L.geoJSON(mapData, {
        style: (_feature) => {
          return {
            color: '#218358',
            weight: 2,
            opacity: 0.8,
            fillColor: '#218358',
            fillOpacity: 0.1,
            className: 'admin-area-path',
            lineJoin: 'round',
            lineCap: 'round',
          };
        },
      }).addTo(this.map);

      if (this.geoJsonLayer.getBounds().isValid()) {
        this.map.fitBounds(this.geoJsonLayer.getBounds(), {
          padding: [20, 20],
          maxZoom: 16,
          animate: false,
        });
      }
    } catch (e) {
      console.error('Error rendering GeoJSON:', e);
    }
  }

  toggleFullscreen(): void {
    this.isMapFullscreen.update((v) => !v);
    // Forzamos un redimensionamiento para que el mapa se ajuste
    setTimeout(() => this.map?.invalidateSize(), 150);
  }

  zoomIn(): void {
    this.map?.zoomIn();
  }

  zoomOut(): void {
    this.map?.zoomOut();
  }

  downloadGeoJSON(): void {
    const geoJson = this.currentGeoJSON();
    if (!geoJson) return;

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(geoJson));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', 'company_areas.geojson');
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }
}
