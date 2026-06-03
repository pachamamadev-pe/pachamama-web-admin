import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnInit,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import * as L from 'leaflet';

/**
 * Metadata de la foto
 */
export interface PhotoMetadata {
  width: number;
  height: number;
  photoId: string;
  fileName: string;
  createdAt: string;
  fileSizeBytes: number;
}

/**
 * Datos del diálogo
 */
export interface PhotoDetailDialogData {
  photoUrl: string; // URL con SAS token
  metadata: PhotoMetadata;
  location: {
    latitude: number;
    longitude: number;
  } | null;
  photoNumber: number; // Número de la foto (1, 2, 3...)
}

/**
 * Diálogo para mostrar detalle de foto con mapa y metadata
 */
@Component({
  selector: 'app-photo-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './photo-detail-dialog.component.html',
  styleUrl: './photo-detail-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotoDetailDialogComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;

  dialogRef = inject(MatDialogRef<PhotoDetailDialogComponent>);
  data = inject<PhotoDetailDialogData>(MAT_DIALOG_DATA);

  imageLoaded = signal(false);
  imageError = signal(false);
  mapLoaded = signal(false);

  private map: L.Map | null = null;
  private resizeObserver: ResizeObserver | null = null;

  ngOnInit(): void {
    // Esperar a que la animación de apertura del diálogo termine antes de inicializar el mapa
    if (this.data.location) {
      this.dialogRef.afterOpened().subscribe(() => this.initializeMap());
    }
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  /**
   * Inicializa el mapa interactivo con OpenStreetMap usando Leaflet
   */
  private initializeMap(): void {
    if (!this.mapContainer?.nativeElement) return;

    const { latitude, longitude } = this.data.location!;

    try {
      // Icono de punto personalizado similar al usado en company-map
      const dotIcon = L.divIcon({
        className: '',
        html: '<div style="width:14px;height:14px;border-radius:50%;background:#218358;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      this.map = L.map(this.mapContainer.nativeElement, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: false,
        doubleClickZoom: true,
        touchZoom: true,
        dragging: true,
      }).setView([latitude, longitude], 15);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(this.map);

      // Agregar marcador en la ubicación de la foto
      L.marker([latitude, longitude], { icon: dotIcon })
        .addTo(this.map)
        .bindPopup(`Foto ${this.data.photoNumber}`)
        .openPopup();

      // Forzar recálculo del tamaño del mapa tras renderizado
      window.setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
        }
      }, 100);

      this.resizeObserver = new ResizeObserver(() => {
        if (this.map) {
          this.map.invalidateSize();
        }
      });
      this.resizeObserver.observe(this.mapContainer.nativeElement);

      this.mapLoaded.set(true);
    } catch (error) {
      console.error('Error al inicializar el mapa Leaflet:', error);
    }
  }

  onImageLoad(): void {
    this.imageLoaded.set(true);
  }

  onImageError(): void {
    this.imageError.set(true);
  }

  close(): void {
    this.dialogRef.close();
  }

  /**
   * Formatea el tamaño del archivo
   */
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * Formatea la fecha
   */
  formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
