import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

/**
 * Detecta si el navegador actual es Chromium-based (Chrome, Edge nuevo, Brave, Opera, Vivaldi).
 * Firefox, Safari, IE y Edge Legacy son considerados "no recomendados".
 */
function detectChromiumBased(): boolean {
  if (typeof navigator === 'undefined') return true; // SSR: no mostrar
  const ua = navigator.userAgent;
  // Chromium-based: tiene "Chrome/" en el UA pero no es Edge Legacy (EdgeHTML) ni IE (Trident)
  const hasChrome = /Chrome\/\d+/.test(ua);
  const isEdgeLegacy = /Edge\/\d+/.test(ua); // Edge 12-18 (EdgeHTML)
  const isIE = /Trident\//.test(ua);
  return hasChrome && !isEdgeLegacy && !isIE;
}

/**
 * Obtiene el nombre del navegador detectado para mostrar en el mensaje.
 */
function getBrowserName(): string {
  const ua = navigator.userAgent;
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari';
  if (/Edge\/\d+/.test(ua)) return 'Microsoft Edge (legacy)';
  if (/Trident\//.test(ua)) return 'Internet Explorer';
  if (/OPR\//.test(ua)) return 'Opera';
  return 'tu navegador actual';
}

@Component({
  selector: 'app-browser-warning',
  imports: [MatIconModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host {
        display: block;
      }

      .browser-banner {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 9999;
        background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
        border-bottom: 3px solid #fe714b;
        box-shadow: 0 4px 16px rgba(254, 113, 75, 0.18);
        animation: slideDown 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
      }

      @keyframes slideDown {
        from {
          transform: translateY(-100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      .banner-inner {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;
        max-width: 1400px;
        margin: 0 auto;
      }

      .banner-icon-wrapper {
        flex-shrink: 0;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: linear-gradient(135deg, #fe714b, #f97316);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(254, 113, 75, 0.35);
      }

      .banner-icon-wrapper mat-icon {
        color: white;
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .banner-text {
        flex: 1;
        min-width: 0;
      }

      .banner-title {
        font-family: 'Inter', sans-serif;
        font-size: 13px;
        font-weight: 700;
        color: #92400e;
        line-height: 1.3;
        margin: 0;
      }

      .banner-subtitle {
        font-family: 'Inter', sans-serif;
        font-size: 12px;
        color: #b45309;
        line-height: 1.4;
        margin: 2px 0 0;
      }

      .banner-link {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-family: 'Inter', sans-serif;
        font-size: 12px;
        font-weight: 600;
        color: #218358;
        text-decoration: none;
        background: white;
        border: 1.5px solid #218358;
        border-radius: 20px;
        padding: 5px 14px;
        white-space: nowrap;
        flex-shrink: 0;
        transition:
          background 0.2s,
          color 0.2s;
      }

      .banner-link:hover {
        background: #218358;
        color: white;
      }

      .banner-link mat-icon {
        font-size: 15px;
        width: 15px;
        height: 15px;
      }

      .close-btn {
        flex-shrink: 0;
        color: #92400e;
        opacity: 0.7;
        transition: opacity 0.2s;
      }

      .close-btn:hover {
        opacity: 1;
      }

      /* Mobile: ocultar el subtítulo para ahorrar espacio */
      @media (max-width: 600px) {
        .banner-subtitle {
          display: none;
        }
        .banner-link span {
          display: none;
        }
      }
    `,
  ],
  template: `
    @if (showBanner()) {
      <div class="browser-banner" role="alert" aria-live="polite">
        <div class="banner-inner">
          <!-- Ícono de advertencia -->
          <div class="banner-icon-wrapper">
            <mat-icon>warning_amber</mat-icon>
          </div>

          <!-- Texto -->
          <div class="banner-text">
            <p class="banner-title">Navegador no recomendado: {{ browserName() }}</p>
            <p class="banner-subtitle">
              Para la mejor experiencia con Pachamama, te recomendamos usar Google Chrome o un
              navegador basado en Chromium.
            </p>
          </div>

          <!-- Botón de descarga -->
          <a
            href="https://www.google.com/intl/es/chrome/"
            target="_blank"
            rel="noopener noreferrer"
            class="banner-link"
          >
            <mat-icon>download</mat-icon>
            <span>Descargar Chrome</span>
          </a>

          <!-- Cerrar -->
          <button
            mat-icon-button
            class="close-btn"
            (click)="dismiss()"
            aria-label="Cerrar aviso de navegador"
          >
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>
    }
  `,
})
export class BrowserWarningComponent {
  private platformId = inject(PLATFORM_ID);

  private _isNotChromium = isPlatformBrowser(this.platformId) ? !detectChromiumBased() : false;

  private dismissed = signal(false);

  /** Nombre legible del navegador detectado */
  browserName = computed(() => (isPlatformBrowser(this.platformId) ? getBrowserName() : ''));

  /** Muestra el banner solo si no es Chromium y no fue cerrado en esta sesión */
  showBanner = computed(() => this._isNotChromium && !this.dismissed());

  dismiss(): void {
    this.dismissed.set(true);
  }
}
