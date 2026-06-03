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
 * Metadata del video
 */
export interface VideoMetadata {
  width: number;
  height: number;
  photoId: string; // Nota: el backend usa "photoId" también para videos
  fileName: string;
  createdAt: string;
  fileSizeBytes: number;
}

/**
 * Datos del diálogo
 */
export interface VideoDetailDialogData {
  videoUrl: string; // URL con SAS token
  metadata: VideoMetadata;
  location: {
    latitude: number;
    longitude: number;
  } | null;
  videoNumber: number; // Número del video (1, 2, 3...)
}

/**
 * Diálogo para mostrar detalle de video con mapa y metadata
 */
@Component({
  selector: 'app-video-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './video-detail-dialog.component.html',
  styleUrl: './video-detail-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoDetailDialogComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('videoPlayer', { static: false }) videoPlayer!: ElementRef<HTMLVideoElement>;

  dialogRef = inject(MatDialogRef<VideoDetailDialogComponent>);
  data = inject<VideoDetailDialogData>(MAT_DIALOG_DATA);

  videoLoaded = signal(false);
  videoError = signal(false);
  mapLoaded = signal(false);
  isBuffering = signal(false);

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

      // Agregar marcador en la ubicación del video
      L.marker([latitude, longitude], { icon: dotIcon })
        .addTo(this.map)
        .bindPopup(`Video ${this.data.videoNumber}`)
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

  onVideoLoad(): void {
    this.videoLoaded.set(true);
    this.isBuffering.set(false);
  }

  onVideoError(): void {
    this.videoError.set(true);
    this.isBuffering.set(false);
  }

  /**
   * Se ejecuta cuando el video está esperando más datos (buffering)
   */
  onBuffering(): void {
    this.isBuffering.set(true);
  }

  /**
   * Se ejecuta cuando el video vuelve a reproducirse
   */
  onPlaying(): void {
    this.isBuffering.set(false);
  }

  /**
   * Se ejecuta cuando hay suficientes datos para reproducir
   */
  onCanPlay(): void {
    this.isBuffering.set(false);
  }

  close(): void {
    // Pausar el video antes de cerrar
    if (this.videoPlayer?.nativeElement) {
      this.videoPlayer.nativeElement.pause();
    }
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

  /**
   * Descarga el video
   */
  downloadVideo(): void {
    const link = document.createElement('a');
    link.href = this.data.videoUrl;
    link.download = this.data.metadata.fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
