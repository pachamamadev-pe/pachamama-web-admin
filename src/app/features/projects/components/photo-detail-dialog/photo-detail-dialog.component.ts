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

// Declarar la API de Google Maps
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const google: any;

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
export class PhotoDetailDialogComponent implements AfterViewInit {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;

  dialogRef = inject(MatDialogRef<PhotoDetailDialogComponent>);
  data = inject<PhotoDetailDialogData>(MAT_DIALOG_DATA);

  imageLoaded = signal(false);
  imageError = signal(false);
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

    // Agregar marcador en la ubicación de la foto
    new google.maps.Marker({
      position: { lat: latitude, lng: longitude },
      map: map,
      title: `Foto ${this.data.photoNumber}`,
    });

    this.mapLoaded.set(true);
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
