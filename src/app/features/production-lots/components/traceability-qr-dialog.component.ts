import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationService } from '@core/services/notification.service';
import { environment } from '@environments/environment';
import QRCode from 'qrcode';

export interface TraceabilityQrDialogData {
  lotNumber: string;
  lotId: string;
  transformationStage: 'primaria' | 'secundaria';
  companyName?: string;
}

@Component({
  selector: 'app-traceability-qr-dialog',
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  template: `
    <div class="qr-dialog-container">
      <!-- ── Header ─────────────────────────────────────────────── -->
      <div class="dialog-header">
        <div class="dialog-header-left">
          <div class="dialog-header-icon">
            <mat-icon>qr_code_2</mat-icon>
          </div>
          <div>
            <h2 mat-dialog-title>QR de Trazabilidad</h2>
            <p class="dialog-header-subtitle">Lote {{ data.lotNumber }}</p>
          </div>
        </div>
        <button mat-icon-button mat-dialog-close class="close-btn" matTooltip="Cerrar">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- ── Content ────────────────────────────────────────────── -->
      <mat-dialog-content class="dialog-content">
        @if (loading()) {
          <div class="loading-state">
            <mat-spinner diameter="48" />
            <p class="loading-text">Generando código QR...</p>
          </div>
        } @else {
          <!-- Stage badge + lot info -->
          <div
            class="lot-info-banner"
            [class.lot-info-banner--secondary]="data.transformationStage === 'secundaria'"
          >
            <mat-icon class="banner-icon">{{
              data.transformationStage === 'primaria' ? 'factory' : 'precision_manufacturing'
            }}</mat-icon>
            <div class="banner-details">
              <span class="banner-lot-number">{{ data.lotNumber }}</span>
              <span class="banner-stage"
                >Transformación
                {{ data.transformationStage === 'primaria' ? 'Primaria' : 'Secundaria' }}</span
              >
              @if (data.companyName) {
                <span class="banner-product">{{ data.companyName }}</span>
              }
            </div>
          </div>

          <!-- QR central -->
          <div class="qr-section">
            <div class="qr-frame">
              <div class="qr-corner qr-corner--tl"></div>
              <div class="qr-corner qr-corner--tr"></div>
              <div class="qr-corner qr-corner--bl"></div>
              <div class="qr-corner qr-corner--br"></div>
              <img
                [src]="qrCodeDataUrl()"
                alt="QR Trazabilidad {{ data.lotNumber }}"
                class="qr-image"
              />
            </div>
            <p class="qr-hint">
              <mat-icon>smartphone</mat-icon>
              Escanea para ver el detalle de trazabilidad del lote
            </p>
          </div>

          <!-- URL del lote -->
          <div class="url-section">
            <div class="url-label">
              <mat-icon>link</mat-icon>
              <span>Enlace de trazabilidad</span>
            </div>
            <div class="url-display">
              <span class="url-value">{{ landingUrl() }}</span>
              <button
                mat-icon-button
                class="url-copy-btn"
                (click)="copyUrl()"
                matTooltip="Copiar enlace"
              >
                <mat-icon>content_copy</mat-icon>
              </button>
            </div>
            <a
              class="url-open-link"
              [href]="landingUrl()"
              target="_blank"
              rel="noopener noreferrer"
            >
              <mat-icon>open_in_new</mat-icon>
              Abrir página de trazabilidad
            </a>
          </div>
        }
      </mat-dialog-content>

      <!-- ── Actions ────────────────────────────────────────────── -->
      <mat-dialog-actions class="dialog-actions">
        <button mat-stroked-button (click)="downloadQR()" [disabled]="loading()">
          <mat-icon>download</mat-icon>
          Descargar QR
        </button>
        <button mat-stroked-button (click)="printQR()" [disabled]="loading()">
          <mat-icon>print</mat-icon>
          Imprimir
        </button>
        <button mat-raised-button class="btn-close" mat-dialog-close>
          <mat-icon>check</mat-icon>
          Cerrar
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .qr-dialog-container {
        width: 100%;
        max-width: 480px;
      }

      /* ── Header ─────────────────────────────────────────────────── */
      .dialog-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px 16px;
        border-bottom: 1px solid #f3f4f6;
      }

      .dialog-header-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .dialog-header-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 42px;
        height: 42px;
        border-radius: 10px;
        background: linear-gradient(135deg, #218358 0%, #1a6b47 100%);
        color: white;
        flex-shrink: 0;

        mat-icon {
          font-size: 22px;
          width: 22px;
          height: 22px;
        }
      }

      h2[mat-dialog-title] {
        margin: 0;
        font-size: 17px;
        font-weight: 700;
        color: #0a0a0a;
        line-height: 1.2;
      }

      .dialog-header-subtitle {
        margin: 2px 0 0;
        font-size: 12px;
        color: #737373;
      }

      .close-btn {
        flex-shrink: 0;
        color: #9ca3af;
      }

      /* ── Content ─────────────────────────────────────────────────── */
      .dialog-content {
        padding: 20px 24px !important;
        display: flex;
        flex-direction: column;
        gap: 20px;
        max-height: 68vh;
      }

      /* ── Loading ─────────────────────────────────────────────────── */
      .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        gap: 16px;
      }

      .loading-text {
        font-size: 14px;
        color: #737373;
        margin: 0;
      }

      /* ── Lot Banner ──────────────────────────────────────────────── */
      .lot-info-banner {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-radius: 10px;
        background: linear-gradient(135deg, #f4fbf6 0%, #e8f5ee 100%);
        border: 1.5px solid #d1fae5;

        &--secondary {
          background: linear-gradient(135deg, #fff8f6 0%, #fce7df 100%);
          border-color: #fdd9ce;

          .banner-icon {
            background: linear-gradient(135deg, #fe714b 0%, #e05a38 100%);
          }
        }
      }

      .banner-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        border-radius: 8px;
        background: linear-gradient(135deg, #218358 0%, #1a6b47 100%);
        color: white;
        flex-shrink: 0;
        font-size: 20px;
        width: 20px;
        height: 20px;
        width: 38px;
        height: 38px;

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }
      }

      .banner-details {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }

      .banner-lot-number {
        font-size: 16px;
        font-weight: 700;
        color: #0a0a0a;
        letter-spacing: 0.02em;
      }

      .banner-stage {
        font-size: 11px;
        font-weight: 600;
        color: #218358;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .lot-info-banner--secondary .banner-stage {
        color: #fe714b;
      }

      .banner-product {
        font-size: 12px;
        color: #6b7280;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* ── QR Section ──────────────────────────────────────────────── */
      .qr-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
      }

      .qr-frame {
        position: relative;
        padding: 16px;
        background: white;
        border-radius: 16px;
        border: 2px solid #e5e7eb;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
      }

      /* Esquinas decorativas del QR */
      .qr-corner {
        position: absolute;
        width: 20px;
        height: 20px;
        border-color: #218358;
        border-style: solid;
      }

      .qr-corner--tl {
        top: 6px;
        left: 6px;
        border-width: 3px 0 0 3px;
        border-radius: 4px 0 0 0;
      }
      .qr-corner--tr {
        top: 6px;
        right: 6px;
        border-width: 3px 3px 0 0;
        border-radius: 0 4px 0 0;
      }
      .qr-corner--bl {
        bottom: 6px;
        left: 6px;
        border-width: 0 0 3px 3px;
        border-radius: 0 0 0 4px;
      }
      .qr-corner--br {
        bottom: 6px;
        right: 6px;
        border-width: 0 3px 3px 0;
        border-radius: 0 0 4px 0;
      }

      .qr-image {
        display: block;
        width: 240px;
        height: 240px;
        border-radius: 4px;
      }

      .qr-hint {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: #9ca3af;
        margin: 0;

        mat-icon {
          font-size: 15px;
          width: 15px;
          height: 15px;
        }
      }

      /* ── URL Section ─────────────────────────────────────────────── */
      .url-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 14px 16px;
        background: #f8fafc;
        border-radius: 10px;
        border: 1px solid #e5e7eb;
      }

      .url-label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 600;
        color: #9ca3af;
        text-transform: uppercase;
        letter-spacing: 0.05em;

        mat-icon {
          font-size: 14px;
          width: 14px;
          height: 14px;
        }
      }

      .url-display {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        background: white;
        border-radius: 6px;
        border: 1px solid #e5e7eb;
      }

      .url-value {
        flex: 1;
        font-size: 11px;
        color: #374151;
        font-family: 'Courier New', monospace;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
      }

      .url-copy-btn {
        flex-shrink: 0;
        width: 28px;
        height: 28px;
        line-height: 28px;
        color: #218358;
      }

      .url-open-link {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 600;
        color: #218358;
        text-decoration: none;
        padding: 6px 8px;
        border-radius: 6px;
        transition: background 0.15s;

        &:hover {
          background: #f4fbf6;
          text-decoration: none;
        }

        mat-icon {
          font-size: 15px;
          width: 15px;
          height: 15px;
        }
      }

      /* ── Actions ─────────────────────────────────────────────────── */
      .dialog-actions {
        padding: 14px 24px;
        border-top: 1px solid #f3f4f6;
        display: flex;
        justify-content: flex-end;
        gap: 8px;

        button {
          font-size: 13px;

          mat-icon {
            font-size: 16px;
            width: 16px;
            height: 16px;
          }
        }
      }

      .btn-close {
        background: #218358 !important;
        color: white !important;
      }

      /* ── Print ────────────────────────────────────────────────────── */
      @media print {
        .dialog-header button,
        .dialog-actions,
        .url-copy-btn,
        .url-open-link {
          display: none !important;
        }

        .qr-dialog-container {
          max-width: 100%;
        }

        .qr-image {
          width: 320px !important;
          height: 320px !important;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TraceabilityQrDialogComponent implements OnInit {
  readonly data = inject<TraceabilityQrDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<TraceabilityQrDialogComponent>);
  private notification = inject(NotificationService);

  loading = signal(true);
  qrCodeDataUrl = signal('');

  /** URL completa de la landing para este lote */
  landingUrl = signal('');

  ngOnInit(): void {
    const url = `${environment.landingBaseUrl}/batch/${this.data.lotNumber}`;
    this.landingUrl.set(url);
    this.generateQRCode(url);
  }

  private generateQRCode(url: string): void {
    QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#218358',
        light: '#FFFFFF',
      },
    })
      .then((dataUrl) => {
        this.qrCodeDataUrl.set(dataUrl);
        this.loading.set(false);
      })
      .catch((err) => {
        console.error('Error generating QR:', err);
        this.notification.error('Error al generar el código QR');
        this.loading.set(false);
      });
  }

  copyUrl(): void {
    navigator.clipboard.writeText(this.landingUrl()).then(
      () => this.notification.success('Enlace copiado al portapapeles'),
      () => this.notification.error('Error al copiar el enlace'),
    );
  }

  downloadQR(): void {
    const link = document.createElement('a');
    link.href = this.qrCodeDataUrl();
    link.download = `qr-trazabilidad-${this.data.lotNumber}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.notification.success('QR descargado correctamente');
  }

  printQR(): void {
    window.print();
  }
}
