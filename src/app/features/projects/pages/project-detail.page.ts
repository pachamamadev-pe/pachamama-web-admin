import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
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
import { forkJoin, interval, Subject, takeUntil, switchMap, takeWhile, catchError, of } from 'rxjs';
import { ProjectsService } from '../services/projects.service';
import { ProductsService } from '../../products/services/products.service';
import { CommunitiesService } from '../../communities/services/communities.service';
import { AreasService } from '../services/areas.service';
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
import {
  GeoJSONFeatureCollection,
  AreaImportResponse,
  AreaImportStatus,
  ImportStatus,
} from '../models/area.model';
import { NotificationService } from '@core/services/notification.service';
import { AzureStorageService } from '@core/services/azure-storage.service';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { InventoryEvaluationComponent } from '../components/inventory-evaluation.component';
import { PmfGenerationComponent } from '../components/pmf-generation/pmf-generation.component';
import { DocumentUploadDialogComponent } from '../components/document-upload-dialog.component';
import { DocumentReviewDialogComponent } from '../components/document-review-dialog.component';
import { DocumentResubmitDialogComponent } from '../components/document-resubmit-dialog.component';
import { CollectorsTabComponent } from '../components/collectors-tab.component';
import { BrigadesTabComponent } from '../components/brigades-tab.component';
import { DocumentsTabComponent } from '../components/documents-tab.component';
import { getProjectStageLabel, getProjectStageClass } from '../models/project.model';
import * as L from 'leaflet';

interface ProjectStage {
  number: number;
  name: string;
  key: string;
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
  ],
  templateUrl: './project-detail.page.html',
  styleUrl: './project-detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDetailPage implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private projectsService = inject(ProjectsService);
  private productsService = inject(ProductsService);
  private communitiesService = inject(CommunitiesService);
  private areasService = inject(AreasService);
  private collectorsService = inject(CollectorsService);
  private brigadesService = inject(BrigadesService);
  private brigadeAssignmentsService = inject(BrigadeAssignmentsService);
  private projectInvitationsService = inject(ProjectInvitationsService);
  private projectDocumentsService = inject(ProjectDocumentsService);
  private activitiesService = inject(ActivitiesService);
  private azureStorage = inject(AzureStorageService);
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);
  private destroy$ = new Subject<void>();

  private map: L.Map | null = null;
  private geoJsonLayer: L.GeoJSON | null = null;
  private areaLabelsLayer: L.LayerGroup | null = null;

  @ViewChild('mapContainer', { static: false }) mapContainer?: ElementRef<HTMLDivElement>;
  @ViewChild(BrigadesTabComponent) brigadesTabComponent?: BrigadesTabComponent;
  @ViewChild(DocumentsTabComponent) documentsTabComponent?: DocumentsTabComponent;

  project = signal<Project | null>(null);
  product = signal<Product | null>(null);
  community = signal<Community | null>(null);
  loading = signal(true);
  selectedTabIndex = signal(0);

  // Track which tabs have loaded their data (lazy loading)
  tabsLoaded = signal<Set<number>>(new Set([0])); // Tab 0 (Resumen) loads immediately

  // Map/Area state
  hasMap = signal(false);
  loadingMap = signal(true);
  currentGeoJSON = signal<GeoJSONFeatureCollection | null>(null);
  isMapFullscreen = signal(false);

  // Upload state
  uploadingFile = signal(false);
  uploadProgress = signal(0);
  importStatus = signal<ImportStatus | null>(null);
  currentImportId = signal<string | null>(null);
  uploadError = signal<string | null>(null);

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
   * Abre dialogo para crear brigada
   */
  openCreateBrigadeDialog(): void {
    const projectCommunityId = this.project()?.communityLink?.id;
    if (!projectCommunityId) {
      this.notification.error('No se puede crear brigada: falta projectCommunityId');
      return;
    }
    import('../components/brigade-form.component').then((m) => {
      const dialogRef = this.dialog.open(m.BrigadeFormDialogComponent, {
        width: '600px',
        maxWidth: '90vw',
        data: { projectCommunityId, mode: 'create' },
        disableClose: true,
      });
      dialogRef.afterClosed().subscribe((result) => {
        if (result?.created) {
          // Recargar brigadas usando el componente
          this.brigadesTabComponent?.reload();
        }
      });
    });
  }

  /**
   * Abre dialogo para editar brigada
   */
  openEditBrigadeDialog(brigade: Brigade): void {
    const projectCommunityId = this.project()?.communityLink?.id;
    if (!projectCommunityId) {
      this.notification.error('No se puede editar brigada: falta projectCommunityId');
      return;
    }
    import('../components/brigade-form.component').then((m) => {
      const dialogRef = this.dialog.open(m.BrigadeFormDialogComponent, {
        width: '600px',
        maxWidth: '90vw',
        data: { projectCommunityId, mode: 'edit', brigade },
        disableClose: true,
      });
      dialogRef.afterClosed().subscribe((result) => {
        if (result?.updated) {
          // Recargar brigadas usando el componente
          this.brigadesTabComponent?.reload();
        }
      });
    });
  }

  // Etapas del proyecto
  stages: ProjectStage[] = [
    { number: 1, name: 'Relacionamiento Comunitario', key: 'planning' },
    { number: 2, name: 'Inventario', key: 'inventory' },
    { number: 3, name: 'Elaboración de PMF', key: 'pmf_development' },
    { number: 4, name: 'Recolección', key: 'collection' },
    { number: 5, name: 'Evaluación y Aprobación (SERFOR)', key: 'serfor_evaluation' },

    { number: 6, name: 'Acopio / Ingreso a CTP', key: 'ctp_entry' },
    { number: 7, name: 'Transformación Primaria', key: 'primary_transformation' },
    { number: 8, name: 'Proceso de Ajuste de Mapas a Estándares IPG/IGN', key: 'map_adjustment' },
  ];

  // Computed para verificar si una etapa está activa
  isStageActive = computed(() => {
    const currentStage = this.project()?.stage;
    return (stageKey: string) => currentStage === stageKey;
  });

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

  // Computed para verificar si se puede avanzar a Recolección (de PMF a Collection)
  canStartCollection = computed(() => {
    const stage = this.project()?.stage;
    const pmfDocApproved = this.isPMFDocumentApproved();

    // DEBUG LOGS
    console.log('🔍 canStartCollection evaluation:', {
      stage,
      pmfDocApproved,
      documentRequirements: this.documentRequirements(),
      documentsCount: this.documents().length,
    });

    // Solo se puede iniciar Recolección si:
    // 1. Está en etapa 'pmf_development'
    // 2. El documento PMF está aprobado
    const canStart = stage === 'pmf_development' && pmfDocApproved;
    console.log('✅ canStartCollection result:', canStart);
    return canStart;
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
    // Mostrar tab desde la etapa de PMF en adelante
    const pmfStageIndex = this.stages.findIndex((s) => s.key === 'pmf_development');
    const currentStageIndex = this.stages.findIndex((s) => s.key === stage);
    return currentStageIndex >= pmfStageIndex && pmfStageIndex !== -1;
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

  // Computed para calcular el índice dinámico del tab "Documentos"
  documentsTabIndex = computed(() => {
    let index = 0;
    // Tab 0: Resumen (siempre presente)
    index++;
    // Tab 1: Recolectores (siempre presente)
    index++;
    // Tab 2: Brigadas (condicional)
    if (this.showBrigadesTab()) index++;
    // Tab 3: Evaluación de inventario (condicional)
    if (this.showInventoryEvaluationTab()) index++;
    // Tab 4: Generar PMF (condicional)
    if (this.showPmfGenerationTab()) index++;
    // Tab 5: Documentos (siempre presente) - este es el índice que buscamos
    return index;
  });

  // Helpers para etiquetas y estilos
  getProjectStageLabel = getProjectStageLabel;
  getProjectStageClass = getProjectStageClass;

  ngOnInit(): void {
    const projectId = this.route.snapshot.paramMap.get('id');
    if (projectId) {
      this.loadProjectDetail(projectId);
      this.checkForExistingMap(projectId);

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

  ngAfterViewInit(): void {
    // Intentar inicializar el mapa si ya tenemos datos GeoJSON
    // (esto puede ocurrir si la carga fue muy rápida)
    if (this.hasMap() && this.currentGeoJSON()) {
      setTimeout(() => this.initializeMap(), 100);
    }
  }

  ngOnDestroy(): void {
    this.destroyMap();
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProjectDetail(id: string): void {
    this.loading.set(true);
    this.projectsService.getProjectById(id).subscribe({
      next: (project) => {
        this.project.set(project);

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

  /**
   * Verifica si el proyecto tiene un mapa cargado
   */
  checkForExistingMap(projectId: string): void {
    this.loadingMap.set(true);
    this.areasService.getCurrentAreaGeoJSON(projectId).subscribe({
      next: (geoJSON) => {
        if (geoJSON && geoJSON.features && geoJSON.features.length > 0) {
          this.hasMap.set(true);
          this.currentGeoJSON.set(geoJSON);
          // Inicializar mapa después de un pequeño delay para asegurar que el DOM esté listo
          setTimeout(() => this.initializeMap(), 100);
        } else {
          this.hasMap.set(false);
        }
        this.loadingMap.set(false);
      },
      error: (error) => {
        // Si el error es 404, significa que no hay mapa
        if (error.status === 404) {
          this.hasMap.set(false);
        } else {
          console.error('Error checking for map:', error);
        }
        this.loadingMap.set(false);
      },
    });
  }

  /**
   * Maneja la selección de uno o más archivos de áreas
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (!files || files.length === 0) {
      return;
    }

    const fileArray = Array.from(files);

    // Validar formatos permitidos
    const allowedExtensions = [
      '.zip',
      '.rar', // Comprimidos
      '.shp',
      '.dbf',
      '.shx',
      '.prj',
      '.cpg', // Shapefile principales
      '.qmd',
      '.sbn',
      '.sbx',
      '.xml',
      '.shp.xml', // Shapefile adicionales
      '.geojson',
      '.json', // GeoJSON
    ];

    const invalidFiles: string[] = [];
    const oversizedFiles: string[] = [];
    const maxSize = 150 * 1024 * 1024; // 150MB

    for (const file of fileArray) {
      // Validar extensión
      const fileName = file.name.toLowerCase();
      const isValid = allowedExtensions.some((ext) => fileName.endsWith(ext));

      if (!isValid) {
        invalidFiles.push(file.name);
        continue;
      }

      // Validar tamaño
      if (file.size > maxSize) {
        oversizedFiles.push(file.name);
      }
    }

    // Mostrar errores si existen
    if (invalidFiles.length > 0) {
      this.notification.error(
        `Formato no soportado: ${invalidFiles.join(', ')}. ` +
          `Formatos permitidos: ZIP, RAR, Shapefiles, GeoJSON`,
      );
      input.value = ''; // Reset input
      return;
    }

    if (oversizedFiles.length > 0) {
      this.notification.error(
        `Archivos demasiado grandes (máximo 150MB): ${oversizedFiles.join(', ')}`,
      );
      input.value = ''; // Reset input
      return;
    }

    // Si todo es válido, proceder con la subida
    this.uploadFiles(fileArray);
    input.value = ''; // Reset input
  }

  /**
   * Inicia la carga de uno o más archivos de áreas
   */
  private uploadFiles(files: File[]): void {
    const projectId = this.project()?.id;
    const projectName = this.project()?.name;

    if (!projectId || !projectName) {
      this.notification.error('Error: Información del proyecto no disponible');
      return;
    }

    this.uploadingFile.set(true);
    this.uploadProgress.set(0);
    this.uploadError.set(null);
    this.importStatus.set(ImportStatus.PENDING);

    const name = `Importación de mapa para proyecto ${projectName}`;
    const source = 'GPS';

    this.areasService.importAreaFiles(projectId, files, name, source).subscribe({
      next: (response: AreaImportResponse) => {
        this.currentImportId.set(response.importId);
        this.notification.success('Archivo enviado. Procesando...');
        // Iniciar polling del estado
        this.startPollingImportStatus(projectId, response.importId);
      },
      error: (error) => {
        console.error('Error uploading shapefile:', error);
        this.uploadingFile.set(false);
        this.uploadError.set('Error al subir el archivo. Intenta nuevamente.');
        this.notification.error('Error al subir el archivo');
      },
    });
  }

  /**
   * Polling del estado de importación (cada 2 segundos)
   */
  private startPollingImportStatus(projectId: string, importId: string): void {
    const pollingInterval = 2000; // 2 segundos
    const maxDuration = 5 * 60 * 1000; // 5 minutos timeout
    const startTime = Date.now();

    interval(pollingInterval)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.areasService.getImportStatus(projectId, importId)),
        takeWhile((status: AreaImportStatus) => {
          // Continuar polling mientras esté PENDING o PROCESSING
          const isProcessing =
            status.status === ImportStatus.PENDING || status.status === ImportStatus.PROCESSING;
          const hasTimeout = Date.now() - startTime > maxDuration;

          if (hasTimeout) {
            this.handleTimeout();
            return false;
          }

          return isProcessing;
        }, true), // true = incluir el último valor
        catchError((error) => {
          console.error('Error polling import status:', error);
          this.handlePollingError();
          return of(null);
        }),
      )
      .subscribe({
        next: (status: AreaImportStatus | null) => {
          if (!status) return;

          this.importStatus.set(status.status);

          // Calcular progreso estimado
          if (status.status === ImportStatus.PROCESSING) {
            const progress = status.featuresImported / Math.max(status.featuresCount, 1);
            this.uploadProgress.set(Math.round(progress * 100));
          }

          // Manejar estados finales
          if (status.status === ImportStatus.COMPLETED) {
            this.handleImportSuccess(projectId);
          } else if (status.status === ImportStatus.FAILED) {
            this.handleImportFailure(status.errors);
          }
        },
      });
  }

  /**
   * Maneja importación exitosa
   */
  private handleImportSuccess(projectId: string): void {
    this.uploadingFile.set(false);
    this.uploadProgress.set(100);
    this.notification.success('¡Mapa cargado exitosamente!');

    // Recargar el mapa actualizado
    setTimeout(() => {
      this.checkForExistingMap(projectId);
      this.resetUploadState();
    }, 1500);
  }

  /**
   * Maneja fallo en importación
   */
  private handleImportFailure(errors: string[] | null): void {
    this.uploadingFile.set(false);
    const errorMessage =
      errors && errors.length > 0 ? errors.join(', ') : 'Error al procesar el shapefile';
    this.uploadError.set(errorMessage);
    this.notification.error('Error al procesar el archivo');
  }

  /**
   * Maneja timeout de polling
   */
  private handleTimeout(): void {
    this.uploadingFile.set(false);
    this.uploadError.set(
      'El procesamiento está tomando más tiempo del esperado. Por favor, recarga la página.',
    );
    this.notification.warning('Procesamiento en curso. Recarga la página en unos minutos.');
  }

  /**
   * Maneja error en el polling
   */
  private handlePollingError(): void {
    this.uploadingFile.set(false);
    this.uploadError.set('Error al verificar el estado de la importación');
    this.notification.error('Error al verificar el estado del archivo');
  }

  /**
   * Dispara el input de archivo para seleccionar shapefile
   */
  triggerFileInput(): void {
    const fileInput = document.getElementById('shapefileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  /**
   * Reinicia el estado de carga para permitir reintento
   */
  retryUpload(): void {
    this.resetUploadState();
    // Trigger file input click
    const fileInput = document.getElementById('shapefileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
      fileInput.click();
    }
  }

  /**
   * Limpia el estado de carga
   */
  private resetUploadState(): void {
    this.uploadingFile.set(false);
    this.uploadProgress.set(0);
    this.importStatus.set(null);
    this.currentImportId.set(null);
    this.uploadError.set(null);
  }

  /**
   * Inicializa el mapa Leaflet con el GeoJSON
   */
  private initializeMap(): void {
    const geoJSON = this.currentGeoJSON();
    if (!geoJSON || !this.mapContainer) {
      return;
    }

    // Destruir mapa existente si hay uno
    this.destroyMap();

    try {
      // Configurar iconos por defecto de Leaflet
      const iconRetinaUrl = '/marker-icon-2x.png';
      const iconUrl = '/marker-icon.png';
      const shadowUrl = '/marker-shadow.png';
      const iconDefault = L.icon({
        iconRetinaUrl,
        iconUrl,
        shadowUrl,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        tooltipAnchor: [16, -28],
        shadowSize: [41, 41],
      });
      L.Marker.prototype.options.icon = iconDefault;
      // Crear mapa Leaflet
      this.map = L.map(this.mapContainer.nativeElement, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: false, // Deshabilitar zoom con scroll
        doubleClickZoom: true,
        touchZoom: true,
        dragging: true,
        boxZoom: true,
        keyboard: true,
      });

      // Agregar capa de OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(this.map);

      // Agregar GeoJSON layer
      this.geoJsonLayer = L.geoJSON(geoJSON as GeoJSON.GeoJsonObject, {
        style: {
          color: '#218358',
          weight: 3,
          opacity: 0.8,
          fillColor: '#218358',
          fillOpacity: 0.2,
        },
        onEachFeature: (feature: GeoJSON.Feature, layer: L.Layer) => {
          // Agregar popup si hay propiedades
          if (feature.properties) {
            const popupContent = Object.entries(feature.properties)
              .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
              .join('<br>');
            (layer as L.Path).bindPopup(popupContent);

            // Agregar etiqueta con número del área
            this.addAreaLabel(feature);
          }
        },
      }).addTo(this.map);

      // Ajustar vista al área del GeoJSON
      const bounds = this.geoJsonLayer.getBounds();
      if (bounds.isValid()) {
        this.map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 16,
          animate: true,
        });
      }

      // Asegurar que el mapa se redibuje correctamente
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
        }
      }, 100);
    } catch (error) {
      console.error('Error initializing map:', error);
      this.notification.error('Error al inicializar el mapa');
    }
  }

  /**
   * Destruye el mapa Leaflet
   */
  private destroyMap(): void {
    if (this.areaLabelsLayer) {
      this.areaLabelsLayer.clearLayers();
      this.areaLabelsLayer = null;
    }
    if (this.geoJsonLayer) {
      this.geoJsonLayer.remove();
      this.geoJsonLayer = null;
    }
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  /**
   * Agrega una etiqueta con el número del área al mapa
   */
  private addAreaLabel(feature: GeoJSON.Feature): void {
    if (!this.map || !feature.properties) return;

    // Buscar el número del área en las propiedades
    const areaNumber = this.getAreaNumber(feature.properties);

    if (areaNumber) {
      // Calcular el centroide del polígono
      const centroid = this.getCentroid(feature);

      if (centroid) {
        // Crear marker con el número del área
        const labelIcon = L.divIcon({
          className: 'area-label',
          html: `<div class="area-number">${areaNumber}</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        const labelMarker = L.marker(centroid, { icon: labelIcon });

        // Agregar a la layer de labels
        if (!this.areaLabelsLayer) {
          this.areaLabelsLayer = L.layerGroup().addTo(this.map);
        }
        this.areaLabelsLayer.addLayer(labelMarker);
      }
    }
  }

  /**
   * Obtiene el número del área de las propiedades del feature
   */
  private getAreaNumber(properties: Record<string, unknown>): string | null {
    // Buscar propiedades comunes que podrían contener el número del área
    const possibleKeys = ['Numero'];

    for (const key of possibleKeys) {
      if (properties[key] !== undefined && properties[key] !== null) {
        return String(properties[key]);
      }
    }

    // Si no encuentra ninguna propiedad específica, usar el índice del feature
    return null;
  }

  /**
   * Calcula el centroide de un feature GeoJSON
   */
  private getCentroid(feature: GeoJSON.Feature): L.LatLng | null {
    if (feature.geometry.type === 'Polygon') {
      const coordinates = feature.geometry.coordinates[0] as [number, number][];
      let latSum = 0;
      let lngSum = 0;
      let count = 0;

      coordinates.forEach((coord) => {
        lngSum += coord[0];
        latSum += coord[1];
        count++;
      });

      if (count > 0) {
        return L.latLng(latSum / count, lngSum / count);
      }
    }

    return null;
  }

  /**
   * Habilita el modo de edición del mapa (permite cargar nuevo shapefile)
   */
  enableEditMode(): void {
    this.hasMap.set(false);
    this.currentGeoJSON.set(null);
    this.destroyMap();
  }

  /**
   * Alterna el modo pantalla completa del mapa
   */
  toggleMapFullscreen(): void {
    this.isMapFullscreen.update((current) => !current);
    // Redimensionar el mapa después del cambio
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 100);
  }

  getProjectPeriod(startDate?: string, endDate?: string): string {
    if (!startDate && !endDate) return '-';

    const formatDate = (dateStr?: string): string => {
      if (!dateStr) return '-';
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    };

    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }

  currentStage(): ProjectStage | null {
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
   * Descarga el GeoJSON actual del proyecto
   */
  downloadGeoJSON(): void {
    const projectId = this.project()?.id;
    if (!projectId) {
      this.notification.error('No se pudo obtener el ID del proyecto');
      return;
    }

    this.notification.info('Descargando GeoJSON...');

    this.areasService.getCurrentAreaGeoJSON(projectId).subscribe({
      next: (geoJSON) => {
        // Convertir el GeoJSON a string con formato
        const dataStr = JSON.stringify(geoJSON, null, 2);

        // Crear un blob con el contenido
        const blob = new Blob([dataStr], { type: 'application/json' });

        // Crear un enlace temporal para descargar
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Nombre del archivo con timestamp
        const projectName = this.project()?.name || 'proyecto';
        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        link.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}_${timestamp}.geojson`;

        // Simular click y limpiar
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        this.notification.success('GeoJSON descargado correctamente');
      },
      error: (error) => {
        console.error('Error downloading GeoJSON:', error);
        this.notification.error('Error al descargar el GeoJSON');
      },
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
        // Recargar usando el componente
        if (this.documentsTabComponent) {
          this.documentsTabComponent.reload();
        } else {
          // Fallback: recargar desde servicio
          this.loadDocumentRequirements(projectId);
          this.loadDocuments(projectId);
        }
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
        // Recargar usando el componente
        const projectId = this.project()?.id;
        if (this.documentsTabComponent) {
          this.documentsTabComponent.reload();
        } else if (projectId) {
          // Fallback: recargar desde servicio
          this.loadDocumentRequirements(projectId);
          this.loadDocuments(projectId);
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
        // Recargar usando el componente
        if (this.documentsTabComponent) {
          this.documentsTabComponent.reload();
        } else {
          // Fallback: recargar desde servicio
          this.loadDocumentRequirements(projectId);
          this.loadDocuments(projectId);
        }
      }
    });
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
