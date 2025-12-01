import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationService } from '@core/services/notification.service';
import QRCode from 'qrcode';

interface DialogData {
  qrCodeContent: string;
  onboardingCode: string;
  expiresAt: string;
  projectName: string;
  communityName: string;
}

@Component({
  selector: 'app-onboarding-qr-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="qr-dialog-container">
      <div class="dialog-header">
        <h2 mat-dialog-title>
          <mat-icon class="header-icon">qr_code_2</mat-icon>
          Código de Invitación - Onboarding
        </h2>
        <button mat-icon-button mat-dialog-close class="close-button">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dialog-content" #dialogContent>
        @if (loading()) {
          <div class="loading-state">
            <mat-spinner diameter="48" />
            <p class="text-body text-neutral-subheading mt-3">Generando código QR...</p>
          </div>
        } @else {
          <!-- Project/Community Info -->
          <div class="info-section">
            <div class="info-item">
              <mat-icon class="info-icon">folder</mat-icon>
              <span class="info-label">Proyecto:</span>
              <span class="info-value">{{ data.projectName }}</span>
            </div>
            <div class="info-item">
              <mat-icon class="info-icon">group</mat-icon>
              <span class="info-label">Comunidad:</span>
              <span class="info-value">{{ data.communityName }}</span>
            </div>
          </div>

          <!-- QR Code Section -->
          <div class="qr-section">
            <div class="qr-container">
              <img [src]="qrCodeDataUrl()" alt="QR Code" class="qr-image" />
            </div>
            <p class="qr-instruction">
              Escanea este código QR con la aplicación móvil para iniciar el onboarding
            </p>
          </div>

          <!-- Divider -->
          <div class="divider">
            <span class="divider-text">O también puedes usar este código</span>
          </div>

          <!-- Onboarding Code Section -->
          <div class="code-section">
            <div class="code-label">
              <mat-icon>password</mat-icon>
              Código de invitación
            </div>
            <div
              class="code-display"
              tabindex="0"
              (click)="copyCode()"
              (keyup.enter)="copyCode()"
              (keyup.space)="copyCode()"
            >
              <span class="code-value">{{ data.onboardingCode }}</span>
              <button mat-icon-button matTooltip="Copiar código">
                <mat-icon>content_copy</mat-icon>
              </button>
            </div>
            <p class="code-hint">Haz clic para copiar el código</p>
          </div>

          <!-- Expiration Warning -->
          <div class="expiration-warning">
            <mat-icon class="warning-icon">schedule</mat-icon>
            <div class="warning-content">
              <span class="warning-label">Este código es válido hasta:</span>
              <span class="warning-date">{{ formattedExpirationDate() }}</span>
            </div>
          </div>
        }
      </mat-dialog-content>

      <mat-dialog-actions class="dialog-actions">
        <button mat-stroked-button (click)="downloadQR()" [disabled]="loading()">
          <mat-icon>download</mat-icon>
          Descargar QR
        </button>
        <button mat-stroked-button (click)="printDialog()" [disabled]="loading()">
          <mat-icon>print</mat-icon>
          Imprimir
        </button>
        <button mat-raised-button color="primary" mat-dialog-close>
          <mat-icon>check</mat-icon>
          Cerrar
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .qr-dialog-container {
        max-width: 600px;
      }

      .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid #e5e5e5;

        h2 {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          color: #0a0a0a;
        }

        .header-icon {
          color: #218358;
          font-size: 28px;
          width: 28px;
          height: 28px;
        }

        .close-button {
          margin-right: -12px;
        }
      }

      .dialog-content {
        padding: 24px !important;
        max-height: 70vh;
      }

      .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
      }

      .info-section {
        background-color: #f4fbf6;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 24px;
      }

      .info-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 0;

        .info-icon {
          color: #218358;
          font-size: 20px;
          width: 20px;
          height: 20px;
        }

        .info-label {
          font-size: 14px;
          color: #737373;
          font-weight: 500;
        }

        .info-value {
          font-size: 14px;
          color: #0a0a0a;
          font-weight: 600;
        }
      }

      .qr-section {
        text-align: center;
        padding: 24px 0;
      }

      .qr-container {
        display: inline-block;
        padding: 20px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        border: 2px solid #e5e5e5;
      }

      .qr-image {
        display: block;
        width: 280px;
        height: 280px;
      }

      .qr-instruction {
        margin-top: 16px;
        font-size: 14px;
        color: #737373;
        line-height: 1.5;
      }

      .divider {
        position: relative;
        text-align: center;
        margin: 32px 0;

        &::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 1px;
          background-color: #e5e5e5;
        }

        .divider-text {
          position: relative;
          display: inline-block;
          padding: 0 16px;
          background-color: white;
          font-size: 13px;
          color: #737373;
          font-weight: 500;
        }
      }

      .code-section {
        text-align: center;
        padding: 20px;
        background-color: #f9fafb;
        border-radius: 12px;
        border: 1px solid #e5e5e5;
      }

      .code-label {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin-bottom: 12px;
        font-size: 14px;
        color: #737373;
        font-weight: 500;

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }
      }

      .code-display {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 16px 24px;
        background-color: white;
        border-radius: 8px;
        border: 2px dashed #218358;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          background-color: #f4fbf6;
          border-color: #1a6b47;
        }

        .code-value {
          font-size: 32px;
          font-weight: 700;
          color: #218358;
          letter-spacing: 4px;
          font-family: 'Courier New', monospace;
        }

        button {
          color: #218358;
        }
      }

      .code-hint {
        margin-top: 8px;
        font-size: 12px;
        color: #737373;
      }

      .expiration-warning {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        margin-top: 24px;
        background-color: #fff8f0;
        border-radius: 8px;
        border: 1px solid #ffd699;

        .warning-icon {
          color: #fe714b;
          font-size: 24px;
          width: 24px;
          height: 24px;
        }

        .warning-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .warning-label {
          font-size: 13px;
          color: #737373;
          font-weight: 500;
        }

        .warning-date {
          font-size: 15px;
          color: #0a0a0a;
          font-weight: 700;
        }
      }

      .dialog-actions {
        padding: 16px 24px;
        border-top: 1px solid #e5e5e5;
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }

      @media print {
        .dialog-header button,
        .dialog-actions {
          display: none !important;
        }

        .qr-dialog-container {
          max-width: 100%;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingQrDialogComponent implements OnInit {
  data = inject<DialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<OnboardingQrDialogComponent>);
  private notification = inject(NotificationService);

  loading = signal(true);
  qrCodeDataUrl = signal('');

  ngOnInit(): void {
    this.generateQRCode();
  }

  /**
   * Genera el código QR desde el qrCodeContent
   */
  private generateQRCode(): void {
    QRCode.toDataURL(this.data.qrCodeContent, {
      width: 280,
      margin: 2,
      color: {
        dark: '#218358',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        this.qrCodeDataUrl.set(url);
        this.loading.set(false);
      })
      .catch((error) => {
        console.error('Error generating QR code:', error);
        this.notification.error('Error al generar el código QR');
        this.loading.set(false);
      });
  }

  /**
   * Formatea la fecha de expiración
   */
  formattedExpirationDate(): string {
    const date = new Date(this.data.expiresAt);
    return date.toLocaleString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Copia el código de onboarding al portapapeles
   */
  copyCode(): void {
    navigator.clipboard.writeText(this.data.onboardingCode).then(
      () => {
        this.notification.success('Código copiado al portapapeles');
      },
      (error) => {
        console.error('Error copying code:', error);
        this.notification.error('Error al copiar el código');
      },
    );
  }

  /**
   * Descarga el código QR como imagen PNG
   */
  downloadQR(): void {
    const link = document.createElement('a');
    link.href = this.qrCodeDataUrl();
    link.download = `onboarding-qr-${this.data.onboardingCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.notification.success('Código QR descargado');
  }

  /**
   * Imprime el dialog completo
   */
  printDialog(): void {
    window.print();
  }
}
