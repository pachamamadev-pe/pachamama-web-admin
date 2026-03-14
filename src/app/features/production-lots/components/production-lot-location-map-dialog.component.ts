import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { GoogleMap, MapMarker } from '@angular/google-maps';
import { TransformationStage } from '../models/production-lot-search.model';

export interface ProductionLotLocationDialogData {
  lotNumber: string;
  transformationStage: TransformationStage;
  location: {
    latitude: number;
    longitude: number;
  };
}

@Component({
  selector: 'app-production-lot-location-map-dialog',
  imports: [DecimalPipe, MatDialogModule, MatButtonModule, MatIconModule, GoogleMap, MapMarker],
  template: `
    <div class="location-dialog">
      <!-- Header -->
      <div class="dialog-header">
        <div class="dialog-title-group">
          <mat-icon class="dialog-pin-icon">location_on</mat-icon>
          <div>
            <h2 class="dialog-title">Punto de Transformación</h2>
            <p class="dialog-subtitle">{{ data.lotNumber }}</p>
          </div>
        </div>
        <button mat-icon-button (click)="close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Map -->
      <div class="map-wrapper">
        <google-map
          height="360px"
          width="100%"
          [center]="center"
          [zoom]="14"
          [options]="mapOptions"
        >
          <map-marker [position]="center" [options]="markerOptions" />
        </google-map>
      </div>

      <!-- Coordinates row -->
      <div class="coords-row">
        <div class="coord-item">
          <span class="coord-label">Latitud</span>
          <span class="coord-value">{{ data.location.latitude | number: '1.6-6' }}°</span>
        </div>
        <div class="coord-divider"></div>
        <div class="coord-item">
          <span class="coord-label">Longitud</span>
          <span class="coord-value">{{ data.location.longitude | number: '1.6-6' }}°</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="dialog-actions">
        <button mat-stroked-button (click)="close()">Cerrar</button>
        <a
          mat-raised-button
          class="btn-maps"
          [href]="mapsUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          <mat-icon>open_in_new</mat-icon>
          Abrir en Google Maps
        </a>
      </div>
    </div>
  `,
  styles: [
    `
      .location-dialog {
        display: flex;
        flex-direction: column;
        min-width: 320px;
        max-width: 560px;
        overflow: hidden;
      }

      .dialog-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px 12px;
        border-bottom: 1px solid #e5e7eb;
      }

      .dialog-title-group {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .dialog-pin-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
        color: #218358;
        flex-shrink: 0;
      }

      .dialog-title {
        font-size: 15px;
        font-weight: 700;
        color: #0a0a0a;
        margin: 0;
        line-height: 1.3;
      }

      .dialog-subtitle {
        font-size: 12px;
        color: #6b7280;
        margin: 0;
        font-family: monospace;
        letter-spacing: 0.03em;
      }

      .map-wrapper {
        border-bottom: 1px solid #e5e7eb;
        line-height: 0;
      }

      .coords-row {
        display: flex;
        align-items: center;
        padding: 12px 20px;
        background-color: #f4fbf6;
        border-bottom: 1px solid #e5e7eb;
        gap: 12px;
      }

      .coord-item {
        display: flex;
        flex-direction: column;
        gap: 1px;
        flex: 1;
      }

      .coord-label {
        font-size: 10px;
        font-weight: 600;
        color: #9ca3af;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }

      .coord-value {
        font-size: 13px;
        font-weight: 600;
        color: #065f46;
        font-family: 'Courier New', monospace;
      }

      .coord-divider {
        width: 1px;
        height: 28px;
        background-color: #d1fae5;
        flex-shrink: 0;
      }

      .dialog-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        padding: 12px 20px;
      }

      .btn-maps {
        background-color: #218358 !important;
        color: white !important;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductionLotLocationMapDialogComponent {
  readonly data = inject<ProductionLotLocationDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<ProductionLotLocationMapDialogComponent>);

  readonly center: google.maps.LatLngLiteral = {
    lat: this.data.location.latitude,
    lng: this.data.location.longitude,
  };

  readonly mapOptions: google.maps.MapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    scrollwheel: true,
    mapTypeId: 'roadmap',
    mapTypeControl: true,
    mapTypeControlOptions: {
      mapTypeIds: ['roadmap', 'hybrid', 'satellite'],
    },
    streetViewControl: false,
    fullscreenControl: true,
  };

  readonly markerOptions: google.maps.MarkerOptions = {
    draggable: false,
    animation: google.maps.Animation.DROP,
  };

  readonly mapsUrl = `https://maps.google.com/?q=${this.data.location.latitude},${this.data.location.longitude}`;

  close(): void {
    this.dialogRef.close();
  }
}
