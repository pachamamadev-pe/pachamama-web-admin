import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { ProductsService } from '../services/products.service';
import { AuthService } from '@core/auth/auth.service';
import { FormSchemaResponse } from '../models';

export type ProjectStage =
  | 'planning'
  | 'inventory'
  | 'collection'
  | 'pmf_development'
  | 'serfor_evaluation'
  | 'ctp_entry'
  | 'primary_transformation'
  | 'map_adjustment';

export interface StageInfo {
  stage: ProjectStage;
  number: number;
  title: string;
  description: string;
  icon: string;
  hasForm: boolean; // Indica si ya tiene formulario dinámico creado
}

/**
 * Componente para gestionar el protocolo de recolección del producto
 * Muestra los stages del proyecto como una secuencia de pasos
 */
@Component({
  selector: 'app-product-collection-protocol',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './product-collection-protocol.component.html',
  styleUrl: './product-collection-protocol.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCollectionProtocolComponent {
  private dialog = inject(MatDialog);
  private productsService = inject(ProductsService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Inputs
  productName = input.required<string>();
  productId = input.required<string>();

  // Outputs
  stageSelected = output<ProjectStage>();

  // Signals
  private publishedStagesSignal = signal<string[]>([]);
  private formsSignal = signal<FormSchemaResponse[]>([]);
  private userRoleSignal = signal<string | null>(null);
  private userCompanyIdSignal = signal<string | null>(null);

  // Stages del proyecto
  stages: StageInfo[] = [
    {
      stage: 'planning',
      number: 1,
      title: 'Relacionamiento Comunitario',
      description: 'Formulario Relacionamiento Comunitario',
      icon: 'groups',
      hasForm: false,
    },
    {
      stage: 'inventory',
      number: 2,
      title: 'Inventario',
      description: 'Formulario Inventario',
      icon: 'inventory',
      hasForm: false,
    },
    {
      stage: 'collection',
      number: 3,
      title: 'Recolección',
      description: 'Formulario Recolección',
      icon: 'agriculture',
      hasForm: false,
    },
    {
      stage: 'pmf_development',
      number: 4,
      title: 'Elaboración de PMF (Plan de Manejo Forestal)',
      description: 'Formulario Elaboración de PMF',
      icon: 'description',
      hasForm: false,
    },
    {
      stage: 'serfor_evaluation',
      number: 5,
      title: 'Evaluación y Aprobación (SERFOR)',
      description: 'Formulario Evaluación y Aprobación (SERFOR)',
      icon: 'verified',
      hasForm: false,
    },
    {
      stage: 'ctp_entry',
      number: 6,
      title: 'Acopio / Ingreso a CTP (Centro de Transformación Primaria)',
      description: 'Formulario Acopio / Ingreso a CTP',
      icon: 'warehouse',
      hasForm: false,
    },
    {
      stage: 'primary_transformation',
      number: 7,
      title: 'Transformación Primaria',
      description: 'Formulario Transformación Primaria',
      icon: 'build',
      hasForm: false,
    },
    {
      stage: 'map_adjustment',
      number: 8,
      title: 'Proceso de Ajuste de Mapas a Estándares IPG/IGN',
      description: 'Formulario Proceso de Ajuste de Mapas a Estándares IPG/IGN',
      icon: 'map',
      hasForm: false,
    },
  ];

  // Computed
  canEditProtocol = computed(() => {
    // ADMIN_EMPRESA y ADMIN_PACHAMAMA pueden crear formularios
    const role = this.userRoleSignal();
    return role === 'ADMIN_EMPRESA' || role === 'ADMIN_PACHAMAMA';
  });

  // Computed para stages con hasForm actualizado
  stagesWithFormStatus = computed(() => {
    const publishedStages = this.publishedStagesSignal();
    return this.stages.map((stage) => ({
      ...stage,
      hasForm: publishedStages.includes(stage.stage.toLowerCase()),
    }));
  });

  /**
   * Obtiene el formulario activo para una etapa específica
   * Busca primero el formulario de la empresa del usuario, luego el global
   * SIEMPRE retorna la versión más reciente (mayor número de versión)
   */
  getFormForStage(stage: ProjectStage): FormSchemaResponse | undefined {
    const forms = this.formsSignal();
    const stageLowerCase = stage.toLowerCase();
    const userCompanyId = this.userCompanyIdSignal();

    // Buscar formularios que incluyan esta etapa
    let formsForStage = forms.filter((form) => form.applicableStages.includes(stageLowerCase));
    if (formsForStage.length === 0) {
      return undefined;
    }

    // Ordenar por versión descendente (versión más reciente primero)
    formsForStage = formsForStage.sort((a, b) => b.version - a.version);

    // Si el usuario tiene companyId (ADMIN_EMPRESA)
    if (userCompanyId) {
      // 1. Buscar formulario de su propia empresa (versión más reciente)
      const ownCompanyForms = formsForStage.filter((form) => form.companyId === userCompanyId);
      if (ownCompanyForms.length > 0) {
        return ownCompanyForms[0]; // Ya está ordenado por versión desc
      }

      // 2. Si no tiene propio, buscar formulario global (companyId null, versión más reciente)
      const globalForms = formsForStage.filter((form) => form.companyId === null);
      if (globalForms.length > 0) {
        return globalForms[0]; // Ya está ordenado por versión desc
      }

      // 3. Si solo existen formularios de otras empresas, retornar undefined
      // Esto permite que el usuario cree su propio formulario
      return undefined;
    }

    // Si el usuario es ADMIN_PACHAMAMA (userCompanyId es null)
    // Buscar el formulario global con la versión más reciente
    const globalForms = formsForStage.filter((form) => form.companyId === null);
    return globalForms.length > 0 ? globalForms[0] : undefined;
  }

  /**
   * Obtiene el estado visual del formulario para una etapa
   * Retorna información para mostrar badges y mensajes
   */
  getFormStatus(stage: ProjectStage): {
    hasForm: boolean;
    status: 'draft' | 'published' | 'archived' | null;
    statusLabel: string;
    statusClass: string;
    version: number | null;
    validUntil: string | null;
    isExpired: boolean;
  } {
    const form = this.getFormForStage(stage);

    if (!form) {
      return {
        hasForm: false,
        status: null,
        statusLabel: '',
        statusClass: '',
        version: null,
        validUntil: null,
        isExpired: false,
      };
    }

    // Verificar si el formulario está expirado
    const isExpired = form.validUntil ? new Date(form.validUntil) < new Date() : false;

    let statusLabel = '';
    let statusClass = '';

    switch (form.status) {
      case 'published':
        if (form.isPublished) {
          statusLabel = isExpired ? 'Publicado (expirado)' : 'Publicado';
          statusClass = isExpired ? 'status-expired' : 'status-published';
        } else {
          statusLabel = 'Despublicado';
          statusClass = 'status-unpublished';
        }
        break;
      case 'draft':
        statusLabel = `Borrador v${form.version}`;
        statusClass = 'status-draft';
        break;
      case 'archived':
        statusLabel = 'Archivado';
        statusClass = 'status-archived';
        break;
    }

    return {
      hasForm: true,
      status: form.status,
      statusLabel,
      statusClass,
      version: form.version,
      validUntil: form.validUntil,
      isExpired,
    };
  }

  constructor() {
    // Effect para cargar formularios cuando cambia productId
    effect(() => {
      const productId = this.productId();
      if (productId) {
        this.loadProductForms(productId);
      }
    });

    // Cargar rol y companyId del usuario
    this.loadUserInfo();
  }

  /**
   * Carga todos los formularios del producto (publicados y no publicados)
   */
  private loadProductForms(productId: string): void {
    this.productsService.getProductForms(productId).subscribe({
      next: (forms) => {
        console.log('📋 Formularios cargados:', forms);
        this.formsSignal.set(forms);

        // Extraer las etapas que tienen formularios (publicados o no)
        const stagesWithForms = forms.flatMap((form) => form.applicableStages);

        // Remover duplicados usando Set
        const uniqueStages = [...new Set(stagesWithForms)];
        this.publishedStagesSignal.set(uniqueStages);
      },
      error: (error) => {
        console.error('❌ Error cargando formularios:', error);
        this.formsSignal.set([]);
        this.publishedStagesSignal.set([]);
      },
    });
  }

  /**
   * Carga el rol y companyId del usuario actual
   */
  private async loadUserInfo(): Promise<void> {
    try {
      const [role, companyId] = await Promise.all([
        this.authService.getUserRole(),
        this.authService.getUserCompanyId(),
      ]);
      this.userRoleSignal.set(role);
      this.userCompanyIdSignal.set(companyId);
    } catch (error) {
      console.error('Error obteniendo información del usuario:', error);
      this.userRoleSignal.set(null);
      this.userCompanyIdSignal.set(null);
    }
  }

  /**
   * Maneja el clic en un stage
   */
  onStageClick(stageInfo: StageInfo): void {
    if (!this.canEditProtocol()) {
      return;
    }

    const existingForm = this.getFormForStage(stageInfo.stage);

    // Si ya tiene formulario configurado
    if (existingForm) {
      const userCompanyId = this.userCompanyIdSignal();
      const formCompanyId = existingForm.companyId;

      let dialogTitle: string;
      let dialogMessage: string;
      let confirmButtonText: string;

      // Caso 1: Formulario configurado por la misma empresa del usuario
      if (formCompanyId && userCompanyId && formCompanyId === userCompanyId) {
        dialogTitle = 'Actualizar formulario existente';
        dialogMessage = `Ya existe un formulario configurado por su empresa para la etapa "${stageInfo.title}" del producto ${this.productName()}.\n\n¿Desea editarlo?`;
        confirmButtonText = 'Editar formulario';
      }
      // Caso 2: Formulario global (configurado por ADMIN_PACHAMAMA) - companyId es null
      else if (!formCompanyId && userCompanyId) {
        dialogTitle = 'Personalizar formulario global';
        dialogMessage = `Existe un formulario global configurado por Pachamama para la etapa "${stageInfo.title}".\n\n¿Desea crear una versión personalizada para su empresa? Esto reemplazará el formulario global para su organización.`;
        confirmButtonText = 'Crear versión personalizada';
      }
      // Caso 3: Usuario ADMIN_PACHAMAMA editando formulario global
      else if (!formCompanyId && !userCompanyId) {
        dialogTitle = 'Editar formulario global';
        dialogMessage = `¿Desea editar el formulario global para la etapa "${stageInfo.title}"?\n\nEste formulario aplica para todas las empresas que no tengan una versión personalizada.`;
        confirmButtonText = 'Editar formulario global';
      }
      // Caso 4: Fallback genérico
      else {
        dialogTitle = 'Actualizar formulario';
        dialogMessage = `Ya existe un formulario configurado para la etapa "${stageInfo.title}".\n\n¿Desea editarlo?`;
        confirmButtonText = 'Editar formulario';
      }

      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: dialogTitle,
          message: dialogMessage,
          confirmText: confirmButtonText,
          type: 'info',
        },
      });

      dialogRef.afterClosed().subscribe((confirmed) => {
        if (confirmed) {
          // Navegar al form builder con el ID del formulario para edición
          this.router.navigate(['/products', this.productId(), 'forms', stageInfo.stage], {
            queryParams: { formId: existingForm.id },
          });
        }
      });

      return;
    }

    // Si no tiene formulario, confirmar creación
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: `Crear formulario para ${stageInfo.title}`,
        message: `¿Está seguro de crear un nuevo formulario dinámico para la etapa "${stageInfo.title}" del producto ${this.productName()}?`,
        confirmText: 'Crear formulario',
        type: 'info',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        // Navegar al form builder para crear nuevo formulario
        this.router.navigate(['/products', this.productId(), 'forms', stageInfo.stage]);
      }
    });
  }
}
