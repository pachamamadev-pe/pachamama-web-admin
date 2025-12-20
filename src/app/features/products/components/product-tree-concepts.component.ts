import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '@core/auth/auth.service';

@Component({
  selector: 'app-product-tree-concepts',
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <div class="concepts-card">
      <div class="card-header">
        <div class="title-section">
          <mat-icon class="tree-icon">park</mat-icon>
          <h3 class="card-title">Conceptos de árbol</h3>
        </div>
        @if (hasContent() && isAdmin()) {
          <button
            mat-icon-button
            class="edit-button"
            (click)="onEditClick()"
            matTooltip="Editar conceptos"
          >
            <mat-icon>edit</mat-icon>
          </button>
        }
      </div>

      <div class="card-content">
        @if (hasContent()) {
          <!-- Contenido HTML existente -->
          <div class="html-content" [innerHTML]="getSafeHtml()"></div>
        } @else {
          <!-- Empty State -->
          <div class="empty-state">
            <div class="empty-icon">
              <mat-icon>description</mat-icon>
            </div>
            <h4 class="empty-title">No se han registrado los conceptos de árbol</h4>
            <p class="empty-subtitle">
              Los conceptos de árbol contienen información detallada sobre
              {{ productName() }}, incluyendo características, beneficios y usos.
            </p>
            @if (isAdmin()) {
              <button mat-raised-button class="btn-primary" (click)="onEditClick()">
                <mat-icon>add</mat-icon>
                Registrar conceptos
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .concepts-card {
      background: white;
      border-radius: 8px;
      border: 1px solid #e5e5e5;
      overflow: hidden;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #e5e5e5;
    }

    .title-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .tree-icon {
      color: #218358;
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .card-title {
      font-size: 18px;
      font-weight: 700;
      color: #0a0a0a;
      margin: 0;
    }

    .edit-button {
      color: #737373;
      transition: color 0.2s;

      &:hover {
        color: #218358;
      }
    }

    .card-content {
      padding: 20px;
      flex: 1;
      overflow-y: auto;
    }

    /* HTML Content Styles */
    .html-content {
      color: #0a0a0a;
      line-height: 1.6;
      font-family: inherit;

      /* Reset de estilos globales para aislar el contenido */
      * {
        all: revert;
      }

      /* Estilos base que replican el editor de Quill */
      :deep(*) {
        font-family: inherit !important;
        line-height: 1.6 !important;
      }

      /* Headings */
      :deep(h1),
      :deep(h2),
      :deep(h3),
      :deep(h4),
      :deep(h5),
      :deep(h6) {
        margin: 16px 0 8px !important;
        font-weight: 700 !important;
        line-height: 1.4 !important;
      }

      :deep(h1) {
        font-size: 2em !important;
        margin: 0.67em 0 !important;
      }
      :deep(h2) {
        font-size: 1.5em !important;
        margin: 0.83em 0 !important;
      }
      :deep(h3) {
        font-size: 1.17em !important;
        margin: 1em 0 !important;
      }
      :deep(h4) {
        font-size: 1em !important;
        margin: 1.33em 0 !important;
      }
      :deep(h5) {
        font-size: 0.83em !important;
        margin: 1.67em 0 !important;
      }
      :deep(h6) {
        font-size: 0.67em !important;
        margin: 2.33em 0 !important;
      }

      /* Párrafos */
      :deep(p) {
        margin: 0 0 1em 0 !important;
        font-size: 14px !important;
        line-height: 1.6 !important;
      }

      /* Listas - Estilos específicos de Quill */
      :deep(ul),
      :deep(ol) {
        margin: 0 0 1em 0 !important;
        padding: 0 0 0 1.5em !important;
        list-style-position: outside !important;
      }

      :deep(ul) {
        list-style-type: disc !important;
      }

      :deep(ol) {
        list-style-type: decimal !important;
      }

      :deep(li) {
        margin: 0.5em 0 !important;
        padding: 0 !important;
        font-size: 14px !important;
        line-height: 1.6 !important;
        display: list-item !important;
      }

      :deep(li:before) {
        content: none !important;
      }

      :deep(ul > li) {
        list-style-type: disc !important;
      }

      :deep(ol > li) {
        list-style-type: decimal !important;
      }

      /* Listas anidadas */
      :deep(ul ul),
      :deep(ol ul) {
        list-style-type: circle !important;
      }

      :deep(ul ul ul),
      :deep(ol ul ul) {
        list-style-type: square !important;
      }

      :deep(ol ol),
      :deep(ul ol) {
        list-style-type: lower-alpha !important;
      }

      /* Formato de texto */
      :deep(strong),
      :deep(b) {
        font-weight: 700 !important;
      }

      :deep(em),
      :deep(i) {
        font-style: italic !important;
      }

      :deep(u) {
        text-decoration: underline !important;
      }

      :deep(s),
      :deep(strike) {
        text-decoration: line-through !important;
      }

      /* Sub y superíndice */
      :deep(sub) {
        vertical-align: sub !important;
        font-size: smaller !important;
      }

      :deep(sup) {
        vertical-align: super !important;
        font-size: smaller !important;
      }

      /* Blockquote */
      :deep(blockquote) {
        margin: 16px 0 !important;
        padding: 12px 16px !important;
        border-left: 4px solid #218358 !important;
        background-color: #f4fbf6 !important;
        font-style: italic !important;
      }

      /* Code block */
      :deep(pre),
      :deep(code) {
        background-color: #f5f5f5 !important;
        border-radius: 4px !important;
        font-family: 'Courier New', monospace !important;
      }

      :deep(pre) {
        padding: 12px !important;
        margin: 16px 0 !important;
        overflow-x: auto !important;
      }

      :deep(code) {
        padding: 2px 4px !important;
        font-size: 90% !important;
      }

      /* Links */
      :deep(a) {
        color: #218358 !important;
        text-decoration: underline !important;

        &:hover {
          color: #1a6b47 !important;
        }
      }

      /* Imágenes */
      :deep(img) {
        max-width: 100% !important;
        height: auto !important;
        margin: 16px 0 !important;
        border-radius: 4px !important;
        display: block !important;
      }

      /* Alineación */
      :deep([style*='text-align: left']),
      :deep(.ql-align-left) {
        text-align: left !important;
      }

      :deep([style*='text-align: center']),
      :deep(.ql-align-center) {
        text-align: center !important;
      }

      :deep([style*='text-align: right']),
      :deep(.ql-align-right) {
        text-align: right !important;
      }

      :deep([style*='text-align: justify']),
      :deep(.ql-align-justify) {
        text-align: justify !important;
      }

      /* Indentación */
      :deep(.ql-indent-1) {
        padding-left: 3em !important;
      }

      :deep(.ql-indent-2) {
        padding-left: 6em !important;
      }

      :deep(.ql-indent-3) {
        padding-left: 9em !important;
      }

      /* Colores - Preservar estilos inline */
      :deep([style*='color']) {
        /* Los estilos inline de color se preservan automáticamente */
      }

      :deep([style*='background-color']) {
        /* Los estilos inline de background se preservan automáticamente */
      }

      /* Tamaños de fuente */
      :deep(.ql-size-small),
      :deep([style*='font-size: small']) {
        font-size: 0.75em !important;
      }

      :deep(.ql-size-large),
      :deep([style*='font-size: large']) {
        font-size: 1.5em !important;
      }

      :deep(.ql-size-huge),
      :deep([style*='font-size: huge']) {
        font-size: 2.5em !important;
      }
    }

    /* Empty State Styles */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 48px 24px;
      min-height: 300px;
    }

    .empty-icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background-color: #f4fbf6;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;

      mat-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        color: #218358;
      }
    }

    .empty-title {
      font-size: 18px;
      font-weight: 700;
      color: #0a0a0a;
      margin: 0 0 8px;
    }

    .empty-subtitle {
      font-size: 14px;
      color: #737373;
      margin: 0 0 24px;
      max-width: 400px;
      line-height: 1.5;
    }

    .btn-primary {
      background-color: #218358;
      color: white;
      height: 40px;
      padding: 0 24px;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: background-color 0.2s;

      &:hover {
        background-color: #1a6b47;
      }

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .card-header {
        padding: 16px;
      }

      .card-content {
        padding: 16px;
      }

      .empty-state {
        padding: 32px 16px;
        min-height: 250px;
      }

      .empty-icon {
        width: 64px;
        height: 64px;

        mat-icon {
          font-size: 32px;
          width: 32px;
          height: 32px;
        }
      }

      .empty-title {
        font-size: 16px;
      }

      .empty-subtitle {
        font-size: 13px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductTreeConceptsComponent implements OnInit {
  private sanitizer = inject(DomSanitizer);
  private authService = inject(AuthService);

  // Inputs
  conceptsHtml = input<string | null>(null);
  productName = input<string>('este producto');
  productId = input.required<string>();

  // Output event to notify parent to open editor dialog
  editConcepts = output<void>();

  // State
  isAdmin = signal(false);

  // Computed
  hasContent = computed(() => {
    const html = this.conceptsHtml();
    return html !== null && html !== undefined && html.trim().length > 0;
  });

  async ngOnInit(): Promise<void> {
    // Check if current user is ADMIN_PACHAMAMA
    try {
      const isAdminPachamama = await this.authService.isAdminPachamama();
      this.isAdmin.set(isAdminPachamama);
    } catch (error) {
      console.error('Error checking admin status:', error);
      this.isAdmin.set(false);
    }
  }

  /**
   * Sanitiza el HTML para prevenir XSS
   * El backend ya sanitiza con OWASP, así que confiamos en el HTML que viene del servidor
   * Usamos bypassSecurityTrustHtml para permitir estilos inline (colores, etc.)
   */
  getSafeHtml(): SafeHtml {
    const html = this.conceptsHtml() || '';
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  /**
   * Emite evento para que el componente padre abra el editor
   */
  onEditClick(): void {
    this.editConcepts.emit();
  }
}
