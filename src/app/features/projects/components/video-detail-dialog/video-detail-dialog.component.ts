import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

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

// Declarar la API de Google Maps
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const google: any;

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
export class VideoDetailDialogComponent implements AfterViewInit {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('videoPlayer', { static: false }) videoPlayer!: ElementRef<HTMLVideoElement>;

  dialogRef = inject(MatDialogRef<VideoDetailDialogComponent>);
  data = inject<VideoDetailDialogData>(MAT_DIALOG_DATA);

  videoLoaded = signal(false);
  videoError = signal(false);
  mapLoaded = signal(false);

  ngAfterViewInit(): void {
    // Inicializar el mapa cuando esté listo
    if (this.data.location && typeof google !== 'undefined') {
      this.initializeMap();
    }
  }

  /**
   * Inicializa el mapa interactivo de Google Maps
   */
  private initializeMap(): void {
    const { latitude, longitude } = this.data.location!;

    const mapOptions = {
      center: { lat: latitude, lng: longitude },
      zoom: 15,
      mapTypeControl: true, // Selector de tipo de mapa (mapa/satélite)
      streetViewControl: true, // Control de Street View
      fullscreenControl: true, // Control de pantalla completa
      zoomControl: true, // Controles de zoom (+/-)
    };

    const map = new google.maps.Map(this.mapContainer.nativeElement, mapOptions);

    // Agregar marcador en la ubicación del video
    new google.maps.Marker({
      position: { lat: latitude, lng: longitude },
      map: map,
      title: `Video ${this.data.videoNumber}`,
    });

    this.mapLoaded.set(true);
  }

  onVideoLoad(): void {
    this.videoLoaded.set(true);
  }

  onVideoError(): void {
    this.videoError.set(true);
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
