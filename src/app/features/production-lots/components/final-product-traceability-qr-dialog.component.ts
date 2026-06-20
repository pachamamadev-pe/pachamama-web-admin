import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationService } from '@core/services/notification.service';
import QRCode from 'qrcode';
import { ProductionLotDetail } from '../../projects/models/production-lot.model';
import { ProductionLotsService } from '../../projects/services/production-lots.service';

const FINAL_PRODUCT_TRACEABILITY_BASE_URL = 'https://landing.pachamama.eco';

export interface FinalProductTraceabilityQrDialogData {
  lotId: string;
  lotNumber: string;
  companyName?: string;
}

@Component({
  selector: 'app-final-product-traceability-qr-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  template: `
    <div class="dialog-shell">
      <div class="dialog-header">
        <div class="dialog-header-copy">
          <div class="dialog-icon-ring">
            <mat-icon>qr_code_2</mat-icon>
          </div>
          <div>
            <h2 mat-dialog-title>Código de producto final</h2>
            <p class="dialog-subtitle">Lote {{ data.lotNumber }}</p>
          </div>
        </div>
        <button mat-icon-button mat-dialog-close matTooltip="Cerrar">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dialog-content">
        @if (loading()) {
          <div class="loading-state">
            <mat-spinner diameter="48" />
            <p>Cargando información del lote...</p>
          </div>
        } @else {
          <div class="lot-banner">
            <div class="lot-banner__icon">
              <mat-icon>precision_manufacturing</mat-icon>
            </div>
            <div class="lot-banner__copy">
              <span class="lot-banner__title">Transformación Secundaria</span>
              <span class="lot-banner__lot">{{ lot()?.lotNumber ?? data.lotNumber }}</span>
              <span class="lot-banner__company">
                {{ lot()?.derivedCompanyName ?? data.companyName ?? 'Empresa no disponible' }}
              </span>
            </div>
          </div>

          @if (!showForm() && hasStoredCodes()) {
            <div class="codes-summary">
              <div class="code-card">
                <span class="code-card__label">Número de lote del cliente</span>
                <span class="code-card__value">{{ currentClientLotNumber() }}</span>
              </div>
              <div class="code-card">
                <span class="code-card__label">Código de producto final</span>
                <span class="code-card__value">{{ currentClientBottleCode() }}</span>
              </div>
            </div>

            @if (qrLoading()) {
              <div class="loading-state loading-state--compact">
                <mat-spinner diameter="36" />
                <p>Generando código QR...</p>
              </div>
            } @else {
              <div class="qr-section">
                <div class="qr-frame">
                  <img
                    [src]="qrCodeDataUrl()"
                    [alt]="'QR producto final ' + currentClientBottleCode()"
                    class="qr-image"
                  />
                </div>
                <p class="qr-hint">
                  <mat-icon>smartphone</mat-icon>
                  Escanea para abrir la trazabilidad del producto final
                </p>
              </div>

              <div class="url-section">
                <div class="url-section__label">
                  <mat-icon>link</mat-icon>
                  <span>Enlace del QR</span>
                </div>
                <div class="url-box">{{ landingUrl() }}</div>
                <div class="url-actions">
                  <button mat-stroked-button type="button" (click)="copyUrl()">
                    <mat-icon>content_copy</mat-icon>
                    Copiar enlace
                  </button>
                  <a
                    mat-stroked-button
                    [href]="landingUrl()"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <mat-icon>open_in_new</mat-icon>
                    Abrir landing
                  </a>
                  <button mat-stroked-button type="button" (click)="downloadQr()">
                    <mat-icon>download</mat-icon>
                    Descargar QR
                  </button>
                </div>
              </div>
            }
          } @else {
            <div class="form-copy">
              <h3>Datos del cliente</h3>
              <p>
                Registra el lote del cliente y el código visible en el producto final para generar
                el QR.
              </p>
            </div>

            <form class="codes-form" [formGroup]="form">
              <mat-form-field appearance="outline">
                <mat-label>Número de lote del cliente</mat-label>
                <input matInput formControlName="clientLotNumber" maxlength="120" />
                @if (
                  form.controls.clientLotNumber.touched &&
                  form.controls.clientLotNumber.hasError('required')
                ) {
                  <mat-error>Ingresa el número de lote del cliente</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Código de producto final</mat-label>
                <input matInput formControlName="clientBottleCode" maxlength="120" />
                @if (
                  form.controls.clientBottleCode.touched &&
                  form.controls.clientBottleCode.hasError('required')
                ) {
                  <mat-error>Ingresa el código del producto final</mat-error>
                }
              </mat-form-field>
            </form>

            <div class="preview-box">
              <span class="preview-box__label">Destino del QR</span>
              <span class="preview-box__value">
                https://landing.pachamama.eco/client-code/&#123;clientBottleCode&#125;
              </span>
            </div>
          }
        }
      </mat-dialog-content>

      <mat-dialog-actions class="dialog-actions" align="end">
        @if (!loading()) {
          @if (showForm()) {
            <button mat-button type="button" (click)="cancelForm()" [disabled]="saving()">
              {{ hasStoredCodes() ? 'Cancelar' : 'Cerrar' }}
            </button>
            <button
              mat-flat-button
              class="btn-primary"
              type="button"
              (click)="saveClientCodes()"
              [disabled]="saving()"
            >
              @if (saving()) {
                Guardando...
              } @else {
                {{ hasStoredCodes() ? 'Renovar QR' : 'Guardar y generar QR' }}
              }
            </button>
          } @else {
            <button mat-button type="button" (click)="renewCodes()">Renovar</button>
            <button mat-flat-button class="btn-primary" type="button" mat-dialog-close>
              Listo
            </button>
          }
        }
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .dialog-shell {
        width: min(100%, 760px);
        display: flex;
        flex-direction: column;
      }

      .dialog-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        padding: 1.5rem 1.5rem 0;
      }

      .dialog-header-copy {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .dialog-icon-ring {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: rgba(33, 131, 88, 0.12);
        color: #218358;
      }

      .dialog-subtitle {
        margin: 0.25rem 0 0;
        color: #667085;
      }

      .dialog-content {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        padding: 1.5rem;
      }

      .loading-state {
        min-height: 240px;
        display: grid;
        place-items: center;
        text-align: center;
        color: #667085;
        gap: 0.75rem;
      }

      .loading-state--compact {
        min-height: auto;
        padding: 1.25rem 0;
      }

      .lot-banner {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 1rem;
        padding: 1rem 1.125rem;
        border-radius: 20px;
        background: linear-gradient(135deg, rgba(33, 131, 88, 0.12), rgba(254, 113, 75, 0.12));
        border: 1px solid rgba(33, 131, 88, 0.15);
      }

      .lot-banner__icon {
        width: 44px;
        height: 44px;
        border-radius: 14px;
        display: grid;
        place-items: center;
        background: #ffffff;
        color: #218358;
      }

      .lot-banner__copy {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
      }

      .lot-banner__title {
        font-size: 0.85rem;
        font-weight: 700;
        color: #218358;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .lot-banner__lot {
        font-size: 1.1rem;
        font-weight: 700;
        color: #101828;
      }

      .lot-banner__company {
        color: #475467;
      }

      .codes-summary {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
      }

      .code-card,
      .preview-box,
      .url-section {
        border: 1px solid #e4e7ec;
        border-radius: 18px;
        background: #ffffff;
      }

      .code-card {
        padding: 1rem 1.125rem;
        display: flex;
        flex-direction: column;
        gap: 0.45rem;
      }

      .code-card__label,
      .preview-box__label,
      .url-section__label {
        font-size: 0.8rem;
        font-weight: 700;
        color: #667085;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .code-card__value,
      .preview-box__value {
        font-size: 1rem;
        font-weight: 600;
        color: #101828;
        word-break: break-word;
      }

      .qr-section {
        display: grid;
        justify-items: center;
        gap: 1rem;
        padding: 0.5rem 0;
      }

      .qr-frame {
        padding: 1rem;
        border-radius: 24px;
        border: 1px solid #e4e7ec;
        background: linear-gradient(180deg, #ffffff, #f8fafc);
        box-shadow: 0 12px 30px rgba(16, 24, 40, 0.08);
      }

      .qr-image {
        width: 280px;
        height: 280px;
        display: block;
      }

      .qr-hint {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin: 0;
        color: #475467;
      }

      .url-section {
        padding: 1rem 1.125rem;
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
      }

      .url-section__label {
        display: flex;
        align-items: center;
        gap: 0.45rem;
      }

      .url-box {
        padding: 0.875rem 1rem;
        border-radius: 14px;
        background: #f8fafc;
        color: #101828;
        word-break: break-all;
      }

      .url-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .form-copy h3 {
        margin: 0 0 0.35rem;
        color: #101828;
      }

      .form-copy p {
        margin: 0;
        color: #667085;
      }

      .codes-form {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
      }

      .codes-form mat-form-field {
        width: 100%;
      }

      .preview-box {
        padding: 1rem 1.125rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        background: #f8fafc;
      }

      .dialog-actions {
        padding: 0 1.5rem 1.5rem;
      }

      @media (max-width: 720px) {
        .codes-summary,
        .codes-form {
          grid-template-columns: 1fr;
        }

        .qr-image {
          width: min(100%, 240px);
          height: auto;
        }

        .url-actions {
          flex-direction: column;
        }

        .url-actions > * {
          width: 100%;
          justify-content: center;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinalProductTraceabilityQrDialogComponent implements OnInit {
  readonly data = inject<FinalProductTraceabilityQrDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<FinalProductTraceabilityQrDialogComponent>);
  private lotsService = inject(ProductionLotsService);
  private notification = inject(NotificationService);
  private fb = inject(FormBuilder);

  lot = signal<ProductionLotDetail | null>(null);
  loading = signal(true);
  saving = signal(false);
  qrLoading = signal(false);
  showForm = signal(false);
  qrCodeDataUrl = signal('');
  landingUrl = signal('');

  readonly form = this.fb.nonNullable.group({
    clientLotNumber: ['', [Validators.required, Validators.maxLength(120)]],
    clientBottleCode: ['', [Validators.required, Validators.maxLength(120)]],
  });

  readonly hasStoredCodes = computed(() => this.hasCompleteCodes(this.lot()));
  readonly currentClientLotNumber = computed(() => this.lot()?.clientLotNumber?.trim() ?? '');
  readonly currentClientBottleCode = computed(() => this.lot()?.clientBottleCode?.trim() ?? '');

  ngOnInit(): void {
    this.loadLot();
  }

  renewCodes(): void {
    this.showForm.set(true);
    this.form.reset({ clientLotNumber: '', clientBottleCode: '' });
    this.qrCodeDataUrl.set('');
    this.landingUrl.set('');
  }

  cancelForm(): void {
    if (!this.hasStoredCodes()) {
      this.dialogRef.close();
      return;
    }

    this.showForm.set(false);
    const clientBottleCode = this.currentClientBottleCode();
    if (clientBottleCode && !this.qrCodeDataUrl()) {
      this.buildQr(clientBottleCode);
    }
  }

  saveClientCodes(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { clientLotNumber, clientBottleCode } = this.form.getRawValue();
    const trimmedLotNumber = clientLotNumber.trim();
    const trimmedBottleCode = clientBottleCode.trim();

    if (!trimmedLotNumber || !trimmedBottleCode) {
      this.notification.error('Completa ambos campos antes de continuar');
      return;
    }

    this.saving.set(true);
    this.lotsService
      .updateClientCodes(this.data.lotId, {
        clientLotNumber: trimmedLotNumber,
        clientBottleCode: trimmedBottleCode,
      })
      .subscribe({
        next: (lot) => {
          this.lot.set(lot);
          this.showForm.set(false);
          this.buildQr(trimmedBottleCode, () => {
            this.saving.set(false);
            this.notification.success('Códigos del cliente guardados correctamente');
          });
        },
        error: (error: { error?: { message?: string } }) => {
          this.saving.set(false);
          this.notification.error(
            error?.error?.message ?? 'No se pudieron guardar los códigos del cliente',
          );
        },
      });
  }

  copyUrl(): void {
    navigator.clipboard.writeText(this.landingUrl()).then(
      () => this.notification.success('Enlace copiado al portapapeles'),
      () => this.notification.error('No se pudo copiar el enlace'),
    );
  }

  downloadQr(): void {
    const link = document.createElement('a');
    link.href = this.qrCodeDataUrl();
    link.download = `qr-producto-final-${this.data.lotNumber}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.notification.success('QR descargado correctamente');
  }

  private loadLot(): void {
    this.loading.set(true);
    this.lotsService.getLotById(this.data.lotId).subscribe({
      next: (lot) => {
        this.lot.set(lot);
        if (this.hasCompleteCodes(lot)) {
          this.showForm.set(false);
          this.buildQr(lot.clientBottleCode!.trim(), () => this.loading.set(false));
          return;
        }

        this.showForm.set(true);
        this.form.patchValue({
          clientLotNumber: lot.clientLotNumber ?? '',
          clientBottleCode: lot.clientBottleCode ?? '',
        });
        this.loading.set(false);
      },
      error: (error: { error?: { message?: string } }) => {
        this.loading.set(false);
        this.notification.error(error?.error?.message ?? 'No se pudo cargar el lote');
        this.dialogRef.close();
      },
    });
  }

  private hasCompleteCodes(
    lot: ProductionLotDetail | null,
  ): lot is ProductionLotDetail & { clientLotNumber: string; clientBottleCode: string } {
    return Boolean(lot?.clientLotNumber?.trim() && lot?.clientBottleCode?.trim());
  }

  private buildQr(clientBottleCode: string, onDone?: () => void): void {
    const url = `${FINAL_PRODUCT_TRACEABILITY_BASE_URL}/client-code/${encodeURIComponent(clientBottleCode)}`;
    this.landingUrl.set(url);
    this.qrLoading.set(true);

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
      })
      .catch((error) => {
        this.notification.error('No se pudo generar el código QR');
        console.error('Error generating final product QR:', error);
      })
      .finally(() => {
        this.qrLoading.set(false);
        onDone?.();
      });
  }
}
