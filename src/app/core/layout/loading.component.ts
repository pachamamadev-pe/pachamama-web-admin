import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { LoadingService } from '../services/loading.service';

/**
 * Componente de loading global
 * Muestra un overlay con spinner cuando hay requests HTTP activos
 *
 * Diseño: Spinner verde Pachamama con logo secundario y backdrop blur
 */
@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, MatIconModule],
  template: `
    @if (loadingService.isLoading()) {
      <div class="loading-overlay">
        <div class="loading-content">
          <!-- Contenedor del logo con spinner alrededor -->
          <div class="spinner-container">
            <mat-spinner diameter="80" color="primary" class="spinner" />
            <div class="logo-wrapper">
              <img src="/images/logo/logo_decundario.svg" alt="Pachamama" class="loading-logo" />
            </div>
          </div>

          <!-- Texto de carga -->
          <p class="loading-text">Cargando...</p>
        </div>
      </div>
    }
  `,
  styles: [
    `
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(4px);
        animation: fadeIn 0.2s ease-out;
      }

      .loading-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
      }

      .spinner-container {
        position: relative;
        width: 80px;
        height: 80px;
      }

      .spinner {
        position: absolute;
        top: 0;
        left: 0;
      }

      /* Personalizar color del spinner a verde Pachamama */
      :host ::ng-deep .spinner circle {
        stroke: #218358 !important;
      }

      .logo-wrapper {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 56px;
        height: 56px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: white;
        border-radius: 50%;
        padding: 8px;
      }

      .loading-logo {
        width: 100%;
        height: 100%;
        object-fit: contain;
        animation: pulse 1.5s ease-in-out infinite;
      }

      @keyframes pulse {
        0%,
        100% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(1.05);
          opacity: 0.9;
        }
      }

      .loading-text {
        font-size: 14px;
        font-weight: 500;
        color: #0a0a0a;
        margin: 0;
        letter-spacing: 0.5px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingComponent {
  loadingService = inject(LoadingService);
}
