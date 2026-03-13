import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, Subject } from 'rxjs';
import { ProjectsService } from '../services/projects.service';
import { ProductsService } from '../../products/services/products.service';
import { CommunitiesService } from '../../communities/services/communities.service';
import { CollectorsService } from '../services/collectors.service';
import { BrigadesService } from '../services/brigades.service';
import { BrigadeAssignmentsService } from '../services/brigade-assignments.service';
import { ProjectInvitationsService } from '../services/project-invitations.service';
import { ProjectDocumentsService } from '../services/project-documents.service';
import { ActivitiesService } from '../services/activities.service';
import { Project } from '../models/project.model';
import { Product } from '../../products/models/product.model';
import { Community } from '../../communities/models/community.model';
import { Collector } from '../models/collector.model';
import { Brigade } from '../models/brigade.model';
import { DocumentRequirements, ProjectDocument } from '../models/project-document.model';
import { NotificationService } from '@core/services/notification.service';
import { parseDateValue } from '@shared/utils/date-helpers';
import { AzureStorageService } from '@core/services/azure-storage.service';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { InventoryEvaluationComponent } from '../components/inventory-evaluation.component';
import { PmfGenerationComponent } from '../components/pmf-generation/pmf-generation.component';
import { DocumentUploadDialogComponent } from '../components/document-upload-dialog.component';
import { DocumentReviewDialogComponent } from '../components/document-review-dialog.component';
import { DocumentResubmitDialogComponent } from '../components/document-resubmit-dialog.component';
import { CollectorsTabComponent } from '../components/collectors-tab.component';
import { BrigadesTabComponent } from '../components/brigades-tab.component';
import { BrigadeStatusGuideDialogComponent } from '../components/brigade-status-guide-dialog.component';
import { CollectorStatusGuideDialogComponent } from '../components/collector-status-guide-dialog.component';
import { DocumentsTabComponent } from '../components/documents-tab.component';
import { CollectionReviewTabComponent } from '../components/collection-review-tab.component';
import { ProjectMapComponent } from '../components/project-map.component';
import {
  getProjectStageLabel,
  getProjectStageClass,
  ProjectActivityTypeKpi,
  CollectorsGenderKpi,
  ActivityValidationStatusKpi,
} from '../models/project.model';
import { BrigadeFormDialogComponent } from '../components/brigade-form.component';
import { ConfigurationTabComponent } from '../components/configuration-tab.component';
import { PmHasPermissionDirective } from '@core/directives/pm-has-permission.directive';
import { SidebarService } from '@core/services/sidebar.service';
import { PERMISSIONS } from '@core/auth/permissions';
import { CollectionBatchesTabComponent } from '../../collection-batches/components/collection-batches-tab.component';
import { PROJECT_WORKFLOW_STAGES, ProjectWorkflowStage } from '../models/project-stages.constants';

interface ActivityValidationStatusChartItem {
  activityType: string;
  status: ActivityValidationStatusKpi;
}

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatCardModule,
    MatTooltipModule,
    MatTableModule,
    MatPaginatorModule,
    MatSelectModule,
    MatFormFieldModule,
    InventoryEvaluationComponent,
    PmfGenerationComponent,
    CollectorsTabComponent,
    BrigadesTabComponent,
    DocumentsTabComponent,
    CollectionReviewTabComponent,
    ProjectMapComponent,
    ConfigurationTabComponent,
    CollectionBatchesTabComponent,
    PmHasPermissionDirective,
  ],
  templateUrl: './project-detail.page.html',
  styleUrl: './project-detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDetailPage implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private projectsService = inject(ProjectsService);
  private productsService = inject(ProductsService);
  private communitiesService = inject(CommunitiesService);
  private collectorsService = inject(CollectorsService);
  private brigadesService = inject(BrigadesService);
  private brigadeAssignmentsService = inject(BrigadeAssignmentsService);
  private projectInvitationsService = inject(ProjectInvitationsService);
  private projectDocumentsService = inject(ProjectDocumentsService);
  private activitiesService = inject(ActivitiesService);
  private azureStorage = inject(AzureStorageService);
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);
  readonly sidebarService = inject(SidebarService);
  readonly PERMISSIONS = PERMISSIONS;
  private destroy$ = new Subject<void>();

  @ViewChild(BrigadesTabComponent) brigadesTabComponent?: BrigadesTabComponent;
  @ViewChild(DocumentsTabComponent) documentsTabComponent?: DocumentsTabComponent;

  project = signal<Project | null>(null);
  product = signal<Product | null>(null);
  community = signal<Community | null>(null);
  loading = signal(true);
  selectedTabIndex = signal(0);
  stagesSidebarCollapsed = signal(false);
  activityTypeKpis = signal<ProjectActivityTypeKpi[]>([]);
  loadingActivityTypeKpis = signal(false);
  collectorsGenderKpis = signal<CollectorsGenderKpi>({
    male: 0,
    female: 0,
    other: 0,
    total: 0,
  });
  loadingCollectorsGenderKpis = signal(false);
  activityValidationStatusKpis = signal<Record<string, ActivityValidationStatusKpi>>({});
  loadingActivityValidationStatusKpis = signal(false);

  // Track which tabs have loaded their data (lazy loading)
  tabsLoaded = signal<Set<number>>(new Set([0])); // Tab 0 (Resumen) loads immediately

  // Collectors state - only store total for validation
  collectorsTotal = signal<number>(0);
  loadingCollectors = signal(false);

  // Brigades state (paginación backend)
  brigades = signal<Brigade[]>([]);
  loadingBrigades = signal(false);
  brigadesPageSize = signal(10);
  brigadesPageIndex = signal(0);
  brigadesTotalElements = signal(0);

  // Columnas de la tabla de brigadas
  brigadesDisplayedColumns: string[] = ['code', 'name', 'status', 'members', 'actions'];

  // Documents state
  documentRequirements = signal<DocumentRequirements | null>(null);
  documents = signal<ProjectDocument[]>([]);
  loadingDocuments = signal(false);
  loadingRequirements = signal(false);

  // Computed: verifica si todos los documentos obligatorios están aprobados
  allDocsApproved = computed(() => this.areAllRequiredDocumentsApproved());

  /**
   * Abre la guía de estados de recolectores
   */
  openCollectorStatusGuide(): void {
    this.dialog.open(CollectorStatusGuideDialogComponent, {
      width: '100%',
      maxWidth: '500px',
      autoFocus: false,
    });
  }

  /**
   * Abre la guía de estados de brigada
   */
  openBrigadeStatusGuide(): void {
    this.dialog.open(BrigadeStatusGuideDialogComponent, {
      width: '100%',
      maxWidth: '500px',
      autoFocus: false,
    });
  }

  /**
   * Abre dialogo para crear brigada
   */
  openCreateBrigadeDialog(): void {
    const projectCommunityId = this.project()?.communityLink?.id;
    const projectId = this.project()?.id;
    const projectStage = this.project()?.stage;
    if (!projectCommunityId) {
      this.notification.error('No se puede crear brigada: falta projectCommunityId');
      return;
    }
    if (!projectId) {
      this.notification.error('No se puede crear brigada: falta projectId');
      return;
    }
    const dialogRef = this.dialog.open(BrigadeFormDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: { projectCommunityId, projectId, projectStage, mode: 'create' },
      disableClose: true,
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result?.created) {
        // Recargar brigadas usando el componente
        this.brigadesTabComponent?.reload();
      }
    });
  }

  /**
   * Abre dialogo para editar brigada
   */
  openEditBrigadeDialog(brigade: Brigade): void {
    const projectCommunityId = this.project()?.communityLink?.id;
    const projectId = this.project()?.id;
    const projectStage = this.project()?.stage;
    if (!projectCommunityId) {
      this.notification.error('No se puede editar brigada: falta projectCommunityId');
      return;
    }
    if (!projectId) {
      this.notification.error('No se puede editar brigada: falta projectId');
      return;
    }
    const dialogRef = this.dialog.open(BrigadeFormDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: { projectCommunityId, projectId, projectStage, mode: 'edit', brigade },
      disableClose: true,
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result?.updated) {
        // Recargar brigadas usando el componente
        this.brigadesTabComponent?.reload();
      }
    });
  }

  /**
   * Abre dialogo para agregar recolectores a una brigada
   */
  openAddMembersDialog(brigade: Brigade): void {
    const projectCommunityId = this.project()?.communityLink?.id;
    const projectId = this.project()?.id;
    const projectStage = this.project()?.stage;
    if (!projectCommunityId) {
      this.notification.error('No se puede agregar recolectores: falta projectCommunityId');
      return;
    }
    if (!projectId) {
      this.notification.error('No se puede agregar recolectores: falta projectId');
      return;
    }
    const dialogRef = this.dialog.open(BrigadeFormDialogComponent, {
      width: '700px',
      maxWidth: '95vw',
      data: { projectCommunityId, projectId, projectStage, mode: 'add-members', brigade },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.membersAdded) {
        this.brigadesTabComponent?.reload();
      }
    });
  }

  // Etapas del proyecto
  readonly stages: ProjectWorkflowStage[] = PROJECT_WORKFLOW_STAGES;

  // Computed para verificar si una etapa está activa
  isStageActive = computed(() => {
    const currentStage = this.project()?.stage;
    return (stageKey: string) => currentStage === stageKey;
  });

  toggleStagesSidebar(): void {
    this.stagesSidebarCollapsed.update((value) => !value);
  }

  // Computed para calcular el progreso basado en la etapa actual
  projectProgress = computed(() => {
    const currentStage = this.project()?.stage;
    if (!currentStage) return 0;

    const stageIndex = this.stages.findIndex((s) => s.key === currentStage);
    if (stageIndex === -1) return 0;

    // Calcular porcentaje: (etapa actual / total etapas) * 100
    const totalStages = this.stages.length;
    const progress = Math.round((stageIndex / totalStages) * 100);
    return progress;
  });

  // Computed para verificar si se puede iniciar el inventario
  canStartInventory = computed(() => {
    const stage = this.project()?.stage;
    const hasCollectors = this.collectorsTotal() > 0;
    const hasBrigades = this.brigades().length > 0;
    const hasRequiredDocs = this.documentRequirements()?.isCompliant || false;
    const allDocsApproved = this.areAllRequiredDocumentsApproved();

    // DEBUG LOGS
    console.log('🔍 canStartInventory evaluation:', {
      stage,
      collectorsTotal: this.collectorsTotal(),
      hasCollectors,
      brigadesCount: this.brigades().length,
      hasBrigades,
      hasRequiredDocs,
      allDocsApproved,
      documentRequirements: this.documentRequirements(),
      documentsCount: this.documents().length,
    });

    // Solo se puede iniciar inventario si:
    // 1. Está en etapa 'planning'
    // 2. Hay recolectores registrados
    // 3. Hay al menos una brigada creada
    // 4. Todos los documentos obligatorios han sido subidos (isCompliant)
    // 5. Todos los documentos obligatorios están aprobados
    const canStart =
      stage === 'planning' && hasCollectors && hasBrigades && hasRequiredDocs && allDocsApproved;
    console.log('✅ canStartInventory result:', canStart);
    return canStart;
  });

  // Activities state para validación de etapas (solo guardamos el total, no el array completo)
  projectActivitiesTotal = signal<number>(0);

  // Computed para verificar si se puede avanzar a PMF (de Inventario a PMF Development)
  canStartPMF = computed(() => {
    const stage = this.project()?.stage;
    const hasActivities = this.projectActivitiesTotal() > 0;

    // DEBUG LOGS
    console.log('🔍 canStartPMF evaluation:', {
      stage,
      projectActivitiesTotal: this.projectActivitiesTotal(),
      hasActivities,
    });

    // Solo se puede iniciar PMF si:
    // 1. Está en etapa 'inventory'
    // 2. Hay al menos una actividad registrada
    const canStart = stage === 'inventory' && hasActivities;
    console.log('✅ canStartPMF result:', canStart);
    return canStart;
  });

  // Computed para verificar si se puede avanzar a Recolección (de serfor_evaluation a Collection)
  canStartCollection = computed(() => {
    const stage = this.project()?.stage;
    const requirements = this.documentRequirements();

    // DEBUG LOGS
    console.log('🔍 canStartCollection evaluation:', {
      stage,
      documentRequirements: requirements,
      documentsCount: this.documents().length,
    });

    // Solo se puede iniciar Recolección si:
    // 1. Está en etapa 'serfor_evaluation'
    // 2. Todos los documentos obligatorios de serfor_evaluation están subidos
    // 3. Todos los documentos obligatorios de serfor_evaluation están aprobados
    if (stage !== 'serfor_evaluation') {
      console.log('✅ canStartCollection result: false (not in serfor_evaluation stage)');
      return false;
    }

    if (!requirements) {
      console.log('✅ canStartCollection result: false (no requirements)');
      return false;
    }

    // Verificar si todos los documentos obligatorios de la etapa están aprobados
    const allStageDocsApproved = this.areAllStageRequiredDocumentsApproved('serfor_evaluation');
    console.log('✅ canStartCollection result:', allStageDocsApproved);
    return allStageDocsApproved;
  });

  // Computed para obtener la siguiente etapa
  nextStage = computed(() => {
    const currentStage = this.project()?.stage;
    if (!currentStage) return null;

    const currentIndex = this.stages.findIndex((s) => s.key === currentStage);
    if (currentIndex === -1 || currentIndex === this.stages.length - 1) return null;

    return this.stages[currentIndex + 1];
  });

  // Computed para verificar si se puede avanzar a la siguiente etapa
  canAdvanceToNextStage = computed(() => {
    const stage = this.project()?.stage;
    if (!stage) return false;

    // Validaciones específicas según la etapa actual
    switch (stage) {
      case 'planning':
        return this.canStartInventory();
      case 'inventory':
        return this.canStartPMF();
      case 'pmf_development':
        return this.canStartCollection();
      case 'serfor_evaluation':
        return this.canStartCollection();
      case 'collection':
        return true;
      case 'ctp_entry':
        // El backend valida que existan lotes con los 3 documentos generados
        return true;
      // TODO: Agregar validaciones para otras transiciones de etapas cuando se definan
      default:
        return false;
    }
  });

  // Computed para verificar si se puede editar el mapa (solo en planning)
  canEditMap = computed(() => {
    const stage = this.project()?.stage;
    return stage === 'planning';
  });

  // Computed para obtener el mensaje de por qué no se puede avanzar (lista de TODAS las condiciones faltantes)
  stageAdvanceBlockerMessage = computed(() => {
    const stage = this.project()?.stage;
    if (!stage) return '';

    const blockers: string[] = [];

    switch (stage) {
      case 'planning':
        if (this.collectorsTotal() === 0) blockers.push('• Registrar recolectores');
        if (!this.brigades().length) blockers.push('• Crear al menos una brigada');
        if (!this.documentRequirements()?.isCompliant)
          blockers.push('• Subir documentos obligatorios');
        if (!this.areAllRequiredDocumentsApproved())
          blockers.push('• Aprobar documentos obligatorios');
        break;
      case 'inventory':
        if (this.projectActivitiesTotal() === 0)
          blockers.push('• Registrar al menos una actividad de inventario');
        break;
      case 'pmf_development':
        if (!this.isPMFDocumentApproved())
          blockers.push('• Aprobar el documento PMF en el tab Documentos');
        break;
      case 'serfor_evaluation':
        if (!this.areAllStageRequiredDocumentsApproved('serfor_evaluation'))
          blockers.push('• Subir y aprobar todos los documentos obligatorios de esta etapa');
        break;
      case 'collection':
        // El backend valida que existan solicitudes y actividades aprobadas
        // No hay validaciones adicionales en el frontend
        break;
      case 'ctp_entry':
        // El backend valida que existan lotes con los 3 documentos generados
        // No hay validaciones adicionales en el frontend
        break;
      default:
        blockers.push('No se puede avanzar desde esta etapa');
    }

    if (blockers.length === 0) return '';
    return 'Para avanzar debes completar:\n' + blockers.join('\n');
  });

  // Computed para mostrar/ocultar el tab de brigadas
  // NOTA: Ahora siempre se muestra, ya que es un tab independiente con lazy loading
  showBrigadesTab = computed(() => {
    return true;
  });

  // Computed para mostrar/ocultar el tab de evaluación de inventario
  showInventoryEvaluationTab = computed(() => {
    const stage = this.project()?.stage;
    return stage !== 'planning';
  });

  // Computed para mostrar/ocultar el tab de generación de PMF
  showPmfGenerationTab = computed(() => {
    const stage = this.project()?.stage;
    // Mostrar tab solo en las etapas pmf_development y serfor_evaluation
    // NO mostrar en collection ni etapas posteriores
    return stage === 'pmf_development' || stage === 'serfor_evaluation';
  });

  // Computed para mostrar/ocultar el tab de revisión de solicitudes de recolección
  showCollectionTab = computed(() => {
    const stage = this.project()?.stage;
    // Mostrar tab desde la etapa de collection en adelante
    const collectionStageIndex = this.stages.findIndex((s) => s.key === 'collection');
    const currentStageIndex = this.stages.findIndex((s) => s.key === stage);
    return currentStageIndex >= collectionStageIndex && collectionStageIndex !== -1;
  });

  // Computed para calcular el índice dinámico del tab "Generar PMF"
  pmfTabIndex = computed(() => {
    let index = 0;
    // Tab 0: Resumen (siempre presente)
    index++;
    // Tab 1: Recolectores (siempre presente)
    index++;
    // Tab 2: Brigadas (condicional)
    if (this.showBrigadesTab()) index++;
    // Tab 3: Evaluación de inventario (condicional)
    if (this.showInventoryEvaluationTab()) index++;
    // Tab 4: Generar PMF (condicional) - este es el índice que buscamos
    return index;
  });

  // Computed para calcular el índice dinámico del tab "Evaluación de inventario"
  inventoryTabIndex = computed(() => {
    let index = 0;
    // Tab 0: Resumen (siempre presente)
    index++;
    // Tab 1: Recolectores (siempre presente)
    index++;
    // Tab 2: Brigadas (condicional)
    if (this.showBrigadesTab()) index++;
    // Tab 3: Evaluación de inventario (condicional) - este es el índice que buscamos
    return index;
  });

  // Computed para calcular el índice dinámico del tab "Brigadas"
  brigadesTabIndex = computed(() => {
    let index = 0;
    // Tab 0: Resumen (siempre presente)
    index++;
    // Tab 1: Recolectores (siempre presente)
    index++;
    // Tab 2: Brigadas (condicional) - este es el índice que buscamos
    return index;
  });

  // Computed para mostrar/ocultar el tab de lotes de acopio
  showAcopioBatchesTab = computed(() => {
    const stage = this.project()?.stage;
    // Mostrar tab desde la etapa ctp_entry en adelante
    const ctpStageIndex = this.stages.findIndex((s) => s.key === 'ctp_entry');
    const currentStageIndex = this.stages.findIndex((s) => s.key === stage);
    return currentStageIndex >= ctpStageIndex && ctpStageIndex !== -1;
  });

  // Computed para calcular el índice dinámico del tab "Lotes de Acopio"
  acopioBatchesTabIndex = computed(() => {
    let index = 0;
    index++; // Tab 0: Resumen
    index++; // Tab 1: Recolectores
    if (this.showBrigadesTab()) index++; // Tab: Brigadas
    if (this.showInventoryEvaluationTab()) index++; // Tab: Inventario
    if (this.showPmfGenerationTab()) index++; // Tab: PMF
    if (this.showCollectionTab()) index++; // Tab: Revisión Solicitudes
    // Tab: Lotes de Acopio - este es el índice que buscamos
    return index;
  });

  // Computed para calcular el índice dinámico del tab "Documentos"
  documentsTabIndex = computed(() => {
    let index = 0;
    index++; // Tab 0: Resumen
    index++; // Tab 1: Recolectores
    if (this.showBrigadesTab()) index++; // Tab: Brigadas
    if (this.showInventoryEvaluationTab()) index++; // Tab: Inventario
    if (this.showPmfGenerationTab()) index++; // Tab: PMF
    if (this.showCollectionTab()) index++; // Tab: Revisión Solicitudes
    if (this.showAcopioBatchesTab()) index++; // Tab: Lotes de Acopio
    // Tab: Documentos - este es el índice que buscamos
    return index;
  });

  // Computed para calcular el índice dinámico del tab "Configuración"
  getConfigurationTabIndex = computed(() => {
    let index = 0;
    index++; // Tab 0: Resumen
    index++; // Tab 1: Recolectores
    if (this.showBrigadesTab()) index++; // Tab: Brigadas
    if (this.showInventoryEvaluationTab()) index++; // Tab: Inventario
    if (this.showPmfGenerationTab()) index++; // Tab: PMF
    if (this.showCollectionTab()) index++; // Tab: Revisión Solicitudes
    if (this.showAcopioBatchesTab()) index++; // Tab: Lotes de Acopio
    index++; // Tab: Documentos
    // Tab: Configuración - este es el índice que buscamos
    return index;
  });

  // Helpers para etiquetas y estilos
  getProjectStageLabel = getProjectStageLabel;
  getProjectStageClass = getProjectStageClass;

  ngOnInit(): void {
    const projectId = this.route.snapshot.paramMap.get('id');
    if (projectId) {
      this.loadProjectDetail(projectId);

      // Check for fragment to auto-select tab
      const fragment = this.route.snapshot.fragment;
      if (fragment === 'inventory') {
        // Use the computed inventoryTabIndex to get the correct dynamic index
        const tabIndex = this.inventoryTabIndex();
        this.selectedTabIndex.set(tabIndex);
        // Mark this tab as loaded so it displays data
        this.tabsLoaded.update((tabs) => new Set(tabs).add(tabIndex));
      }
    } else {
      this.notification.error('ID de proyecto no válido');
      this.router.navigate(['/projects']);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProjectDetail(id: string): void {
    this.loading.set(true);
    this.projectsService.getProjectById(id).subscribe({
      next: (project) => {
        this.project.set(project);
        this.loadActivityTypeKpis(id);
        this.loadCollectorsGenderKpis(id);
        this.loadActivityValidationStatusKpis(id);

        //  comunidad relacionados
        forkJoin({
          communities: this.communitiesService.getCommunities(),
        }).subscribe({
          next: ({ communities }) => {
            // Buscar comunidad por ID
            const matchedCommunity = communities.find(
              (c) => c.id === project.communityLink?.communityId,
            );
            this.community.set(matchedCommunity || null);

            const currentStage = project.stage;
            console.log('🔄 Loading validation data for stage:', currentStage);

            // Cargar datos según el stage actual para evitar llamadas innecesarias
            const projectCommunityId = project.communityLink?.id;

            // STAGE: planning - necesita: collectors, brigades, documents
            if (currentStage === 'planning') {
              if (projectCommunityId) {
                // Solo cargar TOTAL de collectors (size=1) para validación
                // El tab de Recolectores cargará la lista completa cuando el usuario lo abra
                this.loadCollectors(projectCommunityId);

                // Solo cargar TOTAL de brigades (size=1) para validación
                // El tab de Brigadas cargará su propia lista cuando se abra
                this.loadBrigadesTotal(projectCommunityId);
              }

              // Cargar document requirements y documents para validación
              this.loadDocumentRequirements(id);
              this.loadDocuments(id);
            }

            // STAGE: inventory - necesita: activities
            else if (currentStage === 'inventory') {
              // Cargar total de actividades para validación de canStartPMF
              this.loadProjectActivities(id);

              // También cargar documents para cualquier otra validación
              this.loadDocumentRequirements(id);
              this.loadDocuments(id);
            }

            // STAGE: pmf_development - necesita: documents (para verificar PMF aprobado)
            else if (currentStage === 'pmf_development') {
              this.loadDocumentRequirements(id);
              this.loadDocuments(id);
            }

            // STAGES: collection y posteriores - cargar activities para stats
            else if (
              currentStage === 'collection' ||
              currentStage === 'serfor_evaluation' ||
              currentStage === 'ctp_entry' ||
              currentStage === 'primary_transformation' ||
              currentStage === 'map_adjustment'
            ) {
              this.loadProjectActivities(id);
              this.loadDocumentRequirements(id);
              this.loadDocuments(id);
            }

            this.loading.set(false);
          },
          error: (error) => {
            console.error('Error loading related data:', error);
            this.loading.set(false);
          },
        });
      },
      error: (error) => {
        console.error('Error loading project detail:', error);
        this.notification.error('Error al cargar el detalle del proyecto');
        this.loading.set(false);
        this.router.navigate(['/projects']);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/projects']);
  }

  downloadReport(): void {
    this.notification.info('Función de descarga en desarrollo');
  }

  /**
   * Maneja el cambio de tab para implementar lazy loading
   * Solo carga los datos cuando el usuario navega al tab por primera vez
   */
  onTabChange(index: number): void {
    const alreadyLoaded = this.tabsLoaded().has(index);

    if (alreadyLoaded) {
      // Ya se cargó este tab, no hacer nada
      return;
    }

    // Marcar como cargado
    this.tabsLoaded.update((tabs) => new Set(tabs).add(index));

    // Tab 1: Recolectores - se carga con el componente CollectorsTabComponent
    // Tab 2: Brigadas - se carga con el componente BrigadesTabComponent
    // Tab 5: Documentos - ya se carga en ngOnInit para validación de etapas
    // Tab 6: Configuración - no requiere carga adicional

    // Tabs 3 (Inventario) y 4 (PMF) tienen sus propios componentes que manejan su carga
  }

  getProjectPeriod(startDate?: string, endDate?: string): string {
    if (!startDate && !endDate) return '-';

    const formatDate = (dateStr?: string): string => {
      if (!dateStr) return '-';
      const date = parseDateValue(dateStr);
      if (!date) return '-';
      return date.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    };

    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }

  currentStage(): ProjectWorkflowStage | null {
    const stageKey = this.project()?.stage;
    return this.stages.find((stage) => stage.key === stageKey) || null;
  }

  /**
   * Carga el total de recolectores del proyecto (solo para validación)
   */
  loadCollectors(projectCommunityId: string): void {
    this.loadingCollectors.set(true);
    // Fetch only page 0 with size 1 to get the total count
    this.collectorsService.getCollectorsByProjectCommunity(projectCommunityId, 0, 1).subscribe({
      next: (response) => {
        this.collectorsTotal.set(response.total ?? 0);
        this.loadingCollectors.set(false);
      },
      error: (error) => {
        console.error('Error loading collectors count:', error);
        this.notification.error('Error al cargar recolectores');
        this.collectorsTotal.set(0);
        this.loadingCollectors.set(false);
      },
    });
  }

  /**
   * Elimina (inactiva) un recolector
   */
  deleteCollector(collector: Collector): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '¿Inactivar recolector?',
        message: `Esta acción marcará a ${collector.name} ${collector.lastName} como inactivo. ¿Deseas continuar?`,
        confirmText: 'Sí, inactivar',
        type: 'warning',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.performDeleteCollector(collector);
      }
    });
  }

  /**
   * Ejecuta la inactivación del recolector
   */
  private performDeleteCollector(collector: Collector): void {
    if (!collector.id) {
      this.notification.error('Error: ID de recolector no encontrado');
      return;
    }

    this.collectorsService.updateCollectorStatus(collector.id, 'inactive').subscribe({
      next: () => {
        this.notification.success('Recolector inactivado correctamente');
        const projectCommunityId = this.project()?.communityLink?.id;
        if (projectCommunityId) {
          this.loadCollectors(projectCommunityId);
        }
      },
      error: (error) => {
        console.error('Error deleting collector:', error);
        const errorMessage = error?.error?.message || 'Error al inactivar recolector';
        this.notification.error(errorMessage);
      },
    });
  }

  /**
   * Activa un recolector inactivo
   */
  activateCollector(collector: Collector): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '¿Activar recolector?',
        message: `Esta acción marcará a ${collector.name} ${collector.lastName} como activo. ¿Deseas continuar?`,
        confirmText: 'Sí, activar',
        type: 'info',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.performActivateCollector(collector);
      }
    });
  }

  /**
   * Ejecuta la activación del recolector
   */
  private performActivateCollector(collector: Collector): void {
    if (!collector.id) {
      this.notification.error('Error: ID de recolector no encontrado');
      return;
    }

    this.collectorsService.updateCollectorStatus(collector.id, 'active').subscribe({
      next: () => {
        this.notification.success('Recolector activado correctamente');
        const projectCommunityId = this.project()?.communityLink?.id;
        if (projectCommunityId) {
          this.loadCollectors(projectCommunityId);
        }
      },
      error: (error) => {
        console.error('Error activating collector:', error);
        const errorMessage = error?.error?.message || 'Error al activar recolector';
        this.notification.error(errorMessage);
      },
    });
  }

  /**
   * Obtiene la etiqueta en español del estado del recolector
   */
  getCollectorStatusLabel(status: string): string {
    return status === 'active' ? 'Activo' : 'Inactivo';
  }

  /**
   * Obtiene la clase CSS para el chip de estado del recolector
   */
  getCollectorStatusClass(status: string): string {
    return status === 'active' ? 'status-active' : 'status-inactive';
  }

  /**
   * Obtiene la etiqueta en español del estado de la brigada
   */
  getBrigadeStatusLabel(status: string): string {
    return status === 'active' ? 'Activa' : 'Inactiva';
  }

  /**
   * Obtiene la clase CSS para el chip de estado de la brigada
   */
  getBrigadeStatusClass(status: string): string {
    return status === 'active' ? 'status-active' : 'status-inactive';
  }

  /**
   * Carga las brigadas del proyecto con paginación backend
   */
  loadBrigades(projectCommunityId: string, page = 0, size = 10): void {
    this.loadingBrigades.set(true);
    this.brigadesService.getBrigadesByProjectCommunity(projectCommunityId, page, size).subscribe({
      next: (response) => {
        this.brigades.set(response.items);
        this.brigadesTotalElements.set(response.total);
        this.brigadesPageIndex.set(response.page);
        this.brigadesPageSize.set(response.size);
        this.loadingBrigades.set(false);
      },
      error: (error) => {
        console.error('Error loading brigades:', error);
        this.notification.error('Error al cargar brigadas');
        this.brigades.set([]);
        this.brigadesTotalElements.set(0);
        this.loadingBrigades.set(false);
      },
    });
  }

  /**
   * Carga solo el total de brigadas para validación (evita duplicar llamadas)
   */
  private loadBrigadesTotal(projectCommunityId: string): void {
    this.loadingBrigades.set(true);
    // Fetch only page 0 with size 1 to get the total count
    this.brigadesService.getBrigadesByProjectCommunity(projectCommunityId, 0, 1).subscribe({
      next: (response) => {
        // Solo guardamos el total y los items necesarios para validación
        this.brigades.set(response.items);
        this.brigadesTotalElements.set(response.total);
        this.loadingBrigades.set(false);
      },
      error: (error) => {
        console.error('Error loading brigades total:', error);
        this.brigades.set([]);
        this.brigadesTotalElements.set(0);
        this.loadingBrigades.set(false);
      },
    });
  }

  /**
   * Maneja el cambio de página en la tabla de brigadas (paginación backend)
   */
  onBrigadesPageChange(event: PageEvent): void {
    const projectCommunityId = this.project()?.communityLink?.id;
    if (projectCommunityId) {
      this.loadBrigades(projectCommunityId, event.pageIndex, event.pageSize);
    }
  }

  /**
   * Asigna un recolector a una brigada
   */
  assignCollectorToBrigade(collector: Collector, brigadeId: string): void {
    // Si no hay brigadeId (seleccionó "Sin asignar"), no hacer nada
    if (!brigadeId) {
      this.notification.info('Seleccione una brigada para asignar');
      return;
    }

    if (!collector.projectCommunityCollectorId) {
      this.notification.error('Error: El recolector no tiene ID de comunidad');
      return;
    }

    // Fecha actual en formato YYYY-MM-DD (zona horaria local)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const localDateString = `${year}-${month}-${day}`;

    const projectCommunityId = this.project()?.communityLink?.id;

    // Si ya tiene brigada y selecciona una distinta, se REASIGNA
    if (collector.currentBrigadeId && collector.currentBrigadeId !== brigadeId) {
      // Validar si startDate es hoy (posible error de selección)
      if (collector.startDate === localDateString) {
        const currentBrigade = this.brigades().find((b) => b.id === collector.currentBrigadeId);
        const newBrigade = this.brigades().find((b) => b.id === brigadeId);

        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
          data: {
            title: '¿Reasignar recolector?',
            message: `Has asignado a ${collector.name} ${collector.lastName} a la brigada "${currentBrigade?.name || 'N/A'}" hoy. ¿Estás seguro de cambiarla por "${newBrigade?.name || 'N/A'}"?`,
            confirmText: 'Sí, cambiar',
            type: 'warning',
          },
        });

        dialogRef.afterClosed().subscribe((confirmed) => {
          if (!confirmed) {
            // Revertir la selección visualmente
            if (projectCommunityId) {
              this.loadCollectors(projectCommunityId);
            }
            return;
          }

          // Usuario confirmó, proceder con la reasignación
          this.performReassignment(collector, brigadeId, localDateString, projectCommunityId);
        });
        return;
      }

      // startDate no es hoy, proceder directamente
      this.performReassignment(collector, brigadeId, localDateString, projectCommunityId);
      return;
    }

    // Si no tenía brigada asignada, se CREA la asignación
    if (!collector.currentBrigadeId) {
      const request = {
        projectCommunityCollectorId: collector.projectCommunityCollectorId,
        brigadeId,
        startDate: localDateString,
      };

      this.brigadeAssignmentsService.createBrigadeAssignment(request).subscribe({
        next: (assignment) => {
          this.notification.success(
            `${collector.name} ${collector.lastName} asignado a brigada ${assignment.brigadeName}`,
          );
          if (projectCommunityId) {
            this.loadCollectors(projectCommunityId);
          }
        },
        error: (error) => {
          console.error('Error assigning collector to brigade:', error);
          const errorMessage = error?.error?.message || 'Error al asignar recolector a brigada';
          this.notification.error(errorMessage);
          // Recargar collectors para revertir la selección visual
          if (projectCommunityId) {
            this.loadCollectors(projectCommunityId);
          }
        },
      });
      return;
    }

    // Si seleccionó la misma brigada que ya tenía, no hacer nada
    this.notification.info('El recolector ya está asignado a esta brigada');
  }

  /**
   * Realiza la reasignación de brigada
   */
  private performReassignment(
    collector: Collector,
    brigadeId: string,
    startDate: string,
    projectCommunityId?: string,
  ): void {
    const reassignRequest = {
      projectCommunityCollectorId: collector.projectCommunityCollectorId!,
      newBrigadeId: brigadeId,
      startDate,
      notes: 'Reasignación desde UI',
    };

    this.brigadeAssignmentsService.reassignBrigade(reassignRequest).subscribe({
      next: () => {
        this.notification.success(
          `${collector.name} ${collector.lastName} reasignado correctamente`,
        );
        if (projectCommunityId) {
          this.loadCollectors(projectCommunityId);
        }
      },
      error: (error) => {
        console.error('Error reassigning collector:', error);
        const errorMessage = error?.error?.message || 'Error al reasignar recolector';
        this.notification.error(errorMessage);
        // Recargar collectors para revertir la selección visual
        if (projectCommunityId) {
          this.loadCollectors(projectCommunityId);
        }
      },
    });
  }

  /**
   * Abre el modal para ver los recolectores de una brigada
   */
  viewBrigadeMembers(brigade: Brigade): void {
    import('../components/brigade-collectors-dialog.component').then((m) => {
      this.dialog.open(m.BrigadeCollectorsDialogComponent, {
        width: '900px',
        maxWidth: '95vw',
        data: {
          brigadeId: brigade.id,
          brigadeName: brigade.name,
        },
      });
    });
  }

  /**
   * Genera la invitación de onboarding (QR + código)
   */
  generateOnboardingInvitation(): void {
    const projectId = this.project()?.id;
    const communityId = this.community()?.id;
    const projectCommunityId = this.project()?.communityLink?.id;
    const maxCollectors = this.project()?.maxCollectors;

    if (!projectId || !communityId) {
      this.notification.error('No se pudo obtener los datos del proyecto o comunidad');
      return;
    }

    // Validate max collectors if limit is set
    if (maxCollectors !== null && maxCollectors !== undefined && projectCommunityId) {
      // Fetch total collectors to validate against max
      this.collectorsService.getCollectorsByProjectCommunity(projectCommunityId, 0, 1).subscribe({
        next: (response) => {
          const totalCollectors = response.total ?? 0;

          if (totalCollectors >= maxCollectors) {
            this.notification.error(
              `No se puede generar QR de onboarding. Se ha alcanzado el máximo de ${maxCollectors} recolectores permitidos en el proyecto. Debe ampliar el límite.`,
            );
            return;
          }

          // Max not exceeded, proceed with invitation
          this.proceedWithInvitationGeneration(projectId, communityId);
        },
        error: (error) => {
          console.error('Error checking collectors count:', error);
          this.notification.error('Error al validar el número de recolectores');
        },
      });
      return;
    }

    // No max limit set, proceed directly
    this.proceedWithInvitationGeneration(projectId, communityId);
  }

  /**
   * Procede con la generación del código de invitación
   */
  private proceedWithInvitationGeneration(projectId: string, communityId: string): void {
    this.notification.info('Generando código de invitación...');

    this.projectInvitationsService.generateInvitation(projectId, communityId).subscribe({
      next: (response: { qrCodeContent: string; onboardingCode: string; expiresAt: string }) => {
        // Abrir dialog con el QR y código
        import('../components/onboarding-qr-dialog.component').then((m) => {
          this.dialog.open(m.OnboardingQrDialogComponent, {
            width: '650px',
            maxWidth: '95vw',
            data: {
              qrCodeContent: response.qrCodeContent,
              onboardingCode: response.onboardingCode,
              expiresAt: response.expiresAt,
              projectName: this.project()?.name || 'Proyecto',
              communityName: this.community()?.name || 'Comunidad',
            },
            disableClose: false,
          });
        });
        this.notification.success('Código de invitación generado correctamente');
      },
      error: (error: unknown) => {
        console.error('Error generating invitation:', error);
        this.notification.error('Error al generar el código de invitación');
      },
    });
  }

  /**
   * Avanza el proyecto a la siguiente etapa
   */
  advanceToNextStage(): void {
    const projectId = this.project()?.id;
    const currentStage = this.project()?.stage;
    const next = this.nextStage();

    if (!projectId || !currentStage || !next) {
      this.notification.error('No se pudo obtener la información del proyecto');
      return;
    }

    // Debug logging
    console.log('Advancing stage:', {
      projectId,
      currentStage,
      nextStage: next,
      nextKey: next.key,
    });

    // Validar que se pueda avanzar
    if (!this.canAdvanceToNextStage()) {
      const message = this.stageAdvanceBlockerMessage();
      this.notification.warning(message || 'No se puede avanzar a la siguiente etapa');
      return;
    }

    // Solo está implementado el avance de Planning a Inventory
    if (currentStage === 'planning' && next.key === 'inventory') {
      this.notification.info(`Avanzando a etapa: ${next.name}...`);

      this.projectsService.startInventory(projectId).subscribe({
        next: (updatedProject) => {
          this.project.set(updatedProject);
          this.notification.success(`Etapa "${next.name}" iniciada correctamente`);
          // Recargar actividades para la nueva etapa
          this.loadProjectActivities(projectId);
        },
        error: (error) => {
          console.error('Error advancing stage:', error);
          this.notification.error('Error al avanzar a la siguiente etapa');
        },
      });
    } else if (currentStage === 'inventory' && next.key === 'pmf_development') {
      this.notification.info(`Avanzando a etapa: ${next.name}...`);

      // Asegurar que el stage key no sea null o undefined
      const targetStage = next.key;
      if (!targetStage) {
        console.error('Target stage is null or undefined:', next);
        this.notification.error('Error: Etapa de destino inválida');
        return;
      }

      console.log('Calling updateProjectStage with:', { projectId, targetStage });

      this.projectsService.updateProjectStage(projectId, targetStage).subscribe({
        next: (updatedProject) => {
          this.project.set(updatedProject);
          this.notification.success(`Etapa "${next.name}" iniciada correctamente`);
        },
        error: (error) => {
          console.error('Error advancing to PMF stage:', error);
          this.notification.error('Error al avanzar a la etapa de PMF');
        },
      });
    } else if (currentStage === 'serfor_evaluation' && next.key === 'collection') {
      this.notification.info(`Avanzando a etapa: ${next.name}...`);

      const targetStage = next.key;
      if (!targetStage) {
        console.error('Target stage is null or undefined:', next);
        this.notification.error('Error: Etapa de destino inválida');
        return;
      }

      console.log('Calling updateProjectStage with:', { projectId, targetStage });

      this.projectsService.updateProjectStage(projectId, targetStage).subscribe({
        next: (updatedProject) => {
          this.project.set(updatedProject);
          this.notification.success(`Etapa "${next.name}" iniciada correctamente`);
        },
        error: (error) => {
          console.error('Error advancing to Collection stage:', error);
          this.notification.error('Error al avanzar a la etapa de Recolección');
        },
      });
    } else if (currentStage === 'collection' && next.key === 'ctp_entry') {
      this.notification.info(`Avanzando a etapa: ${next.name}...`);

      console.log('Calling startAcopio with:', { projectId });

      this.projectsService.startAcopio(projectId).subscribe({
        next: (updatedProject) => {
          this.project.set(updatedProject);
          this.notification.success(`Etapa "${next.name}" iniciada correctamente`);
        },
        error: (error) => {
          console.error('Error advancing to Acopio/CTP Entry stage:', error);
          const errorMessage =
            error?.error?.message || 'Error al avanzar a la etapa de Acopio/Ingreso a CTP';
          this.notification.error(errorMessage);
        },
      });
    } else if (currentStage === 'ctp_entry' && next.key === 'primary_transformation') {
      this.notification.info(`Avanzando a etapa: ${next.name}...`);

      this.projectsService.startPrimaryTransformation(projectId).subscribe({
        next: (updatedProject) => {
          this.project.set(updatedProject);
          this.notification.success(`Etapa "${next.name}" iniciada correctamente`);
        },
        error: (error) => {
          console.error('Error advancing to Primary Transformation stage:', error);
          // El backend retorna el mensaje de error específico; no mostrar mensaje genérico
          const errorMessage = error?.error?.message;
          if (errorMessage) {
            this.notification.error(errorMessage);
          }
        },
      });
    } else {
      // Otras transiciones aún no implementadas en el backend
      this.notification.warning(
        `La transición de "${currentStage}" a "${next.name}" aún no está implementada en el backend`,
      );
    }
  }

  /**
   * Carga el total de actividades del proyecto para validación de etapas
   * Solo necesitamos saber si existe al menos 1 actividad, no cargar todas
   */
  loadProjectActivities(projectId: string): void {
    // Llamar con page=0, size=1 para obtener solo el total (más eficiente)
    this.activitiesService.getActivitiesByProject(projectId, 0, 1).subscribe({
      next: (response) => {
        this.projectActivitiesTotal.set(response.total);
      },
      error: (error) => {
        console.error('Error loading project activities total:', error);
        this.projectActivitiesTotal.set(0);
      },
    });
  }

  /**
   * Carga KPIs por tipo de actividad para el resumen del proyecto
   */
  loadActivityTypeKpis(projectId: string): void {
    this.loadingActivityTypeKpis.set(true);
    this.projectsService.getActivityTypeKpis(projectId).subscribe({
      next: (response) => {
        this.activityTypeKpis.set(response.data ?? []);
        this.loadingActivityTypeKpis.set(false);
      },
      error: (error) => {
        console.error('Error loading activity type KPIs:', error);
        this.activityTypeKpis.set([]);
        this.loadingActivityTypeKpis.set(false);
      },
    });
  }

  /**
   * Carga KPIs de participación por género para el resumen del proyecto
   */
  loadCollectorsGenderKpis(projectId: string): void {
    this.loadingCollectorsGenderKpis.set(true);
    this.projectsService.getCollectorsGenderKpis(projectId).subscribe({
      next: (response) => {
        this.collectorsGenderKpis.set(response.data);
        this.loadingCollectorsGenderKpis.set(false);
      },
      error: (error) => {
        console.error('Error loading collectors gender KPIs:', error);
        this.collectorsGenderKpis.set({ male: 0, female: 0, other: 0, total: 0 });
        this.loadingCollectorsGenderKpis.set(false);
      },
    });
  }

  /**
   * Carga KPIs de estado de validación por tipo de actividad
   */
  loadActivityValidationStatusKpis(projectId: string): void {
    this.loadingActivityValidationStatusKpis.set(true);
    this.projectsService.getActivityValidationStatusKpis(projectId).subscribe({
      next: (response) => {
        this.activityValidationStatusKpis.set(response.data ?? {});
        this.loadingActivityValidationStatusKpis.set(false);
      },
      error: (error) => {
        console.error('Error loading activity validation status KPIs:', error);
        this.activityValidationStatusKpis.set({});
        this.loadingActivityValidationStatusKpis.set(false);
      },
    });
  }

  /**
   * Obtiene una etiqueta legible para el tipo de actividad
   */
  getActivityTypeDisplayName(activityType: string): string {
    const labels: Record<string, string> = {
      inventory: 'Inventario',
      harvest: 'Cosecha',
      collection: 'Recolección',
      ctp_entry: 'Acopio / Ingreso a CTP',
      primary_transformation: 'Transformación primaria',
      map_adjustment: 'Ajuste de mapas',
    };

    return labels[activityType] ?? activityType;
  }

  getActivityKpiBarWidth(value: number): number {
    const maxValue = Math.max(...this.activityTypeKpis().map((kpi) => kpi.totalActivities), 0);
    if (maxValue <= 0) {
      return 0;
    }

    return (value / maxValue) * 100;
  }

  activityValidationStatusChartItems = computed<ActivityValidationStatusChartItem[]>(() => {
    const data = this.activityValidationStatusKpis();
    return Object.entries(data).map(([activityType, status]) => ({
      activityType,
      status,
    }));
  });

  getValidationStatusWidth(
    status: ActivityValidationStatusKpi,
    validationStatus: 'pending' | 'approved' | 'rejected',
  ): number {
    const total = status.total || status.pending + status.approved + status.rejected;
    if (total <= 0) {
      return 0;
    }

    return (status[validationStatus] / total) * 100;
  }

  getActivityMetricBarWidth(
    kpi: ProjectActivityTypeKpi,
    metric: 'failed' | 'retries' | 'recovered',
  ): number {
    const metricValue =
      metric === 'failed'
        ? kpi.failedActivities
        : metric === 'retries'
          ? kpi.retries
          : kpi.recovered;

    const reference = Math.max(
      kpi.totalActivities,
      kpi.failedActivities,
      kpi.retries,
      kpi.recovered,
      1,
    );

    return (metricValue / reference) * 100;
  }

  private getGenderTotal(): number {
    const data = this.collectorsGenderKpis();
    const calculatedTotal = data.male + data.female + data.other;
    return data.total > 0 ? data.total : calculatedTotal;
  }

  getGenderPercentage(value: number): number {
    const total = this.getGenderTotal();
    if (total <= 0) {
      return 0;
    }

    return (value / total) * 100;
  }

  getCollectorsGenderTotal(): number {
    return this.getGenderTotal();
  }

  getGenderChartGradient(): string {
    const male = this.getGenderPercentage(this.collectorsGenderKpis().male);
    const female = this.getGenderPercentage(this.collectorsGenderKpis().female);
    const other = this.getGenderPercentage(this.collectorsGenderKpis().other);

    const maleEnd = male;
    const femaleEnd = male + female;
    const otherEnd = femaleEnd + other;

    return `conic-gradient(
      #3b82f6 0% ${maleEnd}%,
      #ec4899 ${maleEnd}% ${femaleEnd}%,
      #f59e0b ${femaleEnd}% ${otherEnd}%,
      #e5e5e5 ${otherEnd}% 100%
    )`;
  }

  /**
   * Carga los requerimientos de documentos del proyecto
   */
  loadDocumentRequirements(projectId: string): void {
    this.loadingRequirements.set(true);
    this.projectDocumentsService.getDocumentRequirements(projectId).subscribe({
      next: (requirements) => {
        this.documentRequirements.set(requirements);
        this.loadingRequirements.set(false);
      },
      error: (error) => {
        console.error('Error loading document requirements:', error);
        this.documentRequirements.set(null);
        this.loadingRequirements.set(false);
      },
    });
  }

  /**
   * Carga los documentos del proyecto
   */
  loadDocuments(projectId: string): void {
    this.loadingDocuments.set(true);
    this.projectDocumentsService.getDocuments(projectId).subscribe({
      next: (documents) => {
        this.documents.set(documents);
        this.loadingDocuments.set(false);
      },
      error: (error) => {
        console.error('Error loading documents:', error);
        this.documents.set([]);
        this.loadingDocuments.set(false);
      },
    });
  }

  /**
   * Maneja el avance de etapa cuando se regenera el PMF desde pmf_development
   * Avanza automáticamente a la etapa serfor_evaluation
   */
  onPmfStageAdvanced(): void {
    const projectId = this.project()?.id;
    if (!projectId) return;

    this.projectsService.updateProjectStage(projectId, 'serfor_evaluation').subscribe({
      next: () => {
        this.notification.success('Proyecto avanzado a Evaluación y Aprobación (SERFOR)');
        this.loadProjectDetail(projectId);
      },
      error: (error) => {
        console.error('Error advancing stage:', error);
        const errorMessage = error?.error?.message || 'Error al avanzar etapa del proyecto';
        this.notification.error(errorMessage);
      },
    });
  }

  /**
   * Maneja el evento cuando se genera un nuevo reporte PMF
   * Recarga la lista de documentos para mostrar el nuevo documento
   */
  onReportGenerated(): void {
    const projectId = this.project()?.id;
    if (projectId) {
      console.log('PMF report generated, reloading documents...');
      this.loadDocuments(projectId);
    }
  }

  /**
   * Maneja cuando se cargan los requirements desde el tab de documentos
   */
  onRequirementsLoaded(requirements: DocumentRequirements): void {
    this.documentRequirements.set(requirements);
  }

  /**
   * Abre el dialog para subir documentos
   */
  openUploadDialog(): void {
    const projectId = this.project()?.id;
    const requirements = this.documentRequirements();

    if (!projectId || !requirements) {
      this.notification.error('No se pudo cargar la información del proyecto');
      return;
    }

    const dialogRef = this.dialog.open(DocumentUploadDialogComponent, {
      width: '100%',
      maxWidth: '700px',
      data: { projectId, requirements },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.success) {
        // Recargar documentos en el componente hijo
        if (this.documentsTabComponent) {
          this.documentsTabComponent.reload();
        }
        // SIEMPRE recargar signals del padre para mantener reactividad
        this.loadDocumentRequirements(projectId);
        this.loadDocuments(projectId);
      }
    });
  }

  /**
   * Abre el dialog para revisar un documento
   */
  openReviewDialog(document: ProjectDocument): void {
    const dialogRef = this.dialog.open(DocumentReviewDialogComponent, {
      width: '100%',
      maxWidth: '700px',
      data: { document },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.action) {
        const projectId = this.project()?.id;
        if (!projectId) return;

        // Recargar documentos en el componente hijo
        if (this.documentsTabComponent) {
          this.documentsTabComponent.reload();
        }
        // SIEMPRE recargar signals del padre para mantener reactividad
        this.loadDocumentRequirements(projectId);
        this.loadDocuments(projectId);

        // Si cambió de etapa (PMF observado en serfor_evaluation), recargar proyecto
        if (result.stageChanged) {
          this.loadProjectDetail(projectId);
        }
      }
    });
  }

  /**
   * Abre el dialog para resubir un documento observado
   */
  openResubmitDialog(document: ProjectDocument): void {
    const projectId = this.project()?.id;
    if (!projectId) {
      this.notification.error('No se pudo obtener el ID del proyecto');
      return;
    }

    const dialogRef = this.dialog.open(DocumentResubmitDialogComponent, {
      width: '100%',
      maxWidth: '600px',
      data: { projectId, document },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.success) {
        // Recargar documentos en el componente hijo
        if (this.documentsTabComponent) {
          this.documentsTabComponent.reload();
        }
        // SIEMPRE recargar signals del padre para mantener reactividad
        this.loadDocumentRequirements(projectId);
        this.loadDocuments(projectId);
      }
    });
  }

  /**
   * Verifica si todos los documentos obligatorios de una etapa específica están subidos y aprobados
   */
  areAllStageRequiredDocumentsApproved(stageKey: string): boolean {
    const requirements = this.documentRequirements();
    if (!requirements) {
      return false;
    }

    const documents = this.documents();

    // Obtener documentos obligatorios de la etapa específica
    const stageRequiredDocs = requirements.documentTypes.filter(
      (docType) =>
        docType.isRequired &&
        docType.requiredForStages &&
        docType.requiredForStages.some((stage) => stage === stageKey),
    );

    // Si no hay documentos obligatorios para esta etapa, retornar true
    if (stageRequiredDocs.length === 0) {
      return true;
    }

    // Verificar que todos los documentos obligatorios de la etapa estén subidos y aprobados
    const allApproved = stageRequiredDocs.every((docType) => {
      const docTypeId = docType.documentTypeId;

      // Encontrar el documento en la lista de documentos (última versión)
      const doc = documents.find((d) => {
        return d.documentType.id === docTypeId && d.isLatestVersion;
      });

      // El documento debe existir (estar subido) y estar aprobado
      return doc && doc.validationStatus === 'approved';
    });

    return allApproved;
  }

  /**
   * Verifica si todos los documentos obligatorios están aprobados
   */
  areAllRequiredDocumentsApproved(): boolean {
    const requirements = this.documentRequirements();
    if (!requirements) {
      return false;
    }

    const documents = this.documents();

    // Obtener documentos obligatorios que han sido subidos
    const requiredDocs = requirements.documentTypes.filter(
      (docType) => docType.isRequired && docType.isUploaded,
    );

    // Si no hay documentos obligatorios subidos, retornar true
    // (no hay nada que revisar)
    if (requiredDocs.length === 0) {
      return true;
    }

    // Verificar que cada documento obligatorio tenga su última versión aprobada
    const allApproved = requiredDocs.every((docType) => {
      const docTypeId = docType.documentTypeId;

      // Encontrar el documento en la lista de documentos
      const doc = documents.find((d) => {
        const matches = d.documentType.id === docTypeId && d.isLatestVersion;
        return matches;
      });

      // El documento debe existir y estar aprobado
      return doc && doc.validationStatus === 'approved';
    });

    return allApproved;
  }

  /**
   * Verifica si el documento PMF (Plan de Manejo Forestal) está aprobado
   */
  isPMFDocumentApproved(): boolean {
    const requirements = this.documentRequirements();
    if (!requirements) {
      return false;
    }

    const documents = this.documents();

    // Buscar el tipo de documento PMF
    const pmfDocType = requirements.documentTypes.find(
      (docType) =>
        docType.name?.toLowerCase().includes('pmf') ||
        docType.name?.toLowerCase().includes('plan de manejo'),
    );

    if (!pmfDocType) {
      return false;
    }

    // Encontrar el documento PMF subido (última versión)
    const pmfDoc = documents.find(
      (d) => d.documentType.id === pmfDocType.documentTypeId && d.isLatestVersion,
    );

    // El documento debe existir y estar aprobado
    return pmfDoc ? pmfDoc.validationStatus === 'approved' : false;
  }

  /**
   * Mensaje de error cuando faltan documentos por aprobar
   */
  getDocumentApprovalMessage(): string {
    const requirements = this.documentRequirements();
    if (!requirements) return '';

    // Si no cumple con isCompliant, faltan documentos por subir
    if (!requirements.isCompliant) {
      return 'Faltan subir documentos obligatorios';
    }

    // Si cumple con isCompliant pero no todos están aprobados
    const allApproved = this.areAllRequiredDocumentsApproved();
    if (!allApproved) {
      return 'Faltan aprobar documentos obligatorios';
    }

    return '';
  }

  /**
   * Descarga un documento
   */
  downloadDocument(document: ProjectDocument): void {
    // Usar AzureStorageService para obtener URL con SAS token
    this.azureStorage.getFileUrl(document.blobName).subscribe({
      next: (url) => {
        // Abrir en nueva pestaña para descargar
        window.open(url, '_blank');
      },
      error: (error) => {
        console.error('Error getting download URL:', error);
        this.notification.error('Error al obtener URL de descarga');
      },
    });
  }
}
