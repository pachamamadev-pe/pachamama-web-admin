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
import { Project } from '../models/project.model';
import { Product } from '../../products/models/product.model';
import { Community } from '../../communities/models/community.model';
import { Collector } from '../models/collector.model';
import { Brigade } from '../models/brigade.model';
import {
  GeoJSONFeatureCollection,
  AreaImportResponse,
  AreaImportStatus,
  ImportStatus,
} from '../models/area.model';
import { NotificationService } from '@core/services/notification.service';
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
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);
  private destroy$ = new Subject<void>();

  private map: L.Map | null = null;
  private geoJsonLayer: L.GeoJSON | null = null;
  private areaLabelsLayer: L.LayerGroup | null = null;

  @ViewChild('mapContainer', { static: false }) mapContainer?: ElementRef<HTMLDivElement>;

  project = signal<Project | null>(null);
  product = signal<Product | null>(null);
  community = signal<Community | null>(null);
  loading = signal(true);
  selectedTabIndex = signal(0);

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

  // Collectors state
  collectors = signal<Collector[]>([]);
  loadingCollectors = signal(false);

  // Pagination state for collectors
  collectorsPageSize = signal(10);
  collectorsPageIndex = signal(0);

  // Computed para collectors paginados
  paginatedCollectors = computed(() => {
    const allCollectors = this.collectors();
    const pageSize = this.collectorsPageSize();
    const pageIndex = this.collectorsPageIndex();
    const startIndex = pageIndex * pageSize;
    const endIndex = startIndex + pageSize;
    return allCollectors.slice(startIndex, endIndex);
  });

  // Columnas de la tabla de recolectores
  collectorsDisplayedColumns: string[] = [
    'name',
    'lastName',
    'documentType',
    'documentNumber',
    'phone',
    'assignedBrigade',
  ];

  // Brigades state (paginación backend)
  brigades = signal<Brigade[]>([]);
  loadingBrigades = signal(false);
  brigadesPageSize = signal(10);
  brigadesPageIndex = signal(0);
  brigadesTotalElements = signal(0);

  // Columnas de la tabla de brigadas
  brigadesDisplayedColumns: string[] = ['code', 'name', 'members'];

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
        data: { projectCommunityId },
        disableClose: true,
      });
      dialogRef.afterClosed().subscribe((result) => {
        if (result?.created) {
          // Recargar brigadas desde primera página
          this.loadBrigades(projectCommunityId, 0, this.brigadesPageSize());
        }
      });
    });
  }

  // Etapas del proyecto
  stages: ProjectStage[] = [
    { number: 1, name: 'Relacionamiento Comunitario', key: 'planning' },
    { number: 2, name: 'Inventario', key: 'inventory' },
    { number: 3, name: 'Recolección', key: 'collection' },
    { number: 4, name: 'Elaboración de PMF', key: 'pmf_development' },
    { number: 5, name: 'Evaluación y Aprobación (SERFOR)', key: 'serfor_evaluation' },
    { number: 6, name: 'Recolección', key: 'harvest' },
    { number: 7, name: 'Acopio / Ingreso a CTP', key: 'collection' },
    { number: 8, name: 'Transformación Primaria', key: 'primary_transformation' },
    { number: 9, name: 'Proceso de Ajuste de Mapas a Estándares IPG/IGN', key: 'map_adjustment' },
  ];

  // Computed para verificar si una etapa está activa
  isStageActive = computed(() => {
    const currentStage = this.project()?.stage;
    return (stageKey: string) => currentStage === stageKey;
  });

  // Helpers para etiquetas y estilos
  getProjectStageLabel = getProjectStageLabel;
  getProjectStageClass = getProjectStageClass;

  ngOnInit(): void {
    const projectId = this.route.snapshot.paramMap.get('id');
    if (projectId) {
      this.loadProjectDetail(projectId);
      this.checkForExistingMap(projectId);
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

            // Cargar recolectores si existe communityLink.id
            if (project.communityLink?.id) {
              this.loadCollectors(project.communityLink.id);
              this.loadBrigades(project.communityLink.id);
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
   * Maneja la selección de archivo
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Validar extensión
      if (!file.name.endsWith('.zip')) {
        this.notification.error('Solo se permiten archivos .zip');
        return;
      }

      // Validar tamaño (ej: máximo 50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        this.notification.error('El archivo es demasiado grande (máximo 50MB)');
        return;
      }

      this.uploadShapefile(file);
    }
  }

  /**
   * Inicia la carga del shapefile
   */
  private uploadShapefile(file: File): void {
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

    this.areasService.importAreaShapefile(projectId, file, name, source).subscribe({
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
   * Inicia la etapa de Inventario si el proyecto está en planificación
   */
  startInventoryStage(): void {
    const proj = this.project();
    if (!proj) return;
    if (proj.stage !== 'planning') {
      this.notification.warning('La etapa actual no permite iniciar inventario');
      return;
    }
    this.projectsService.startInventory(proj.id).subscribe({
      next: (updated) => {
        this.project.set(updated);
        this.notification.success('Inventario iniciado');
      },
      error: (error) => {
        console.error('Error iniciando inventario:', error);
        this.notification.error('Error al iniciar inventario');
      },
    });
  }

  /**
   * Carga los recolectores del proyecto
   */
  loadCollectors(projectCommunityId: string): void {
    this.loadingCollectors.set(true);
    this.collectorsService.getCollectorsByProjectCommunity(projectCommunityId).subscribe({
      next: (collectors) => {
        this.collectors.set(collectors);
        this.loadingCollectors.set(false);
      },
      error: (error) => {
        console.error('Error loading collectors:', error);
        this.notification.error('Error al cargar recolectores');
        this.collectors.set([]);
        this.loadingCollectors.set(false);
      },
    });
  }

  /**
   * Maneja el cambio de página en la tabla de recolectores
   */
  onCollectorsPageChange(event: PageEvent): void {
    this.collectorsPageIndex.set(event.pageIndex);
    this.collectorsPageSize.set(event.pageSize);
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

    // Fecha actual en formato YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];

    const projectCommunityId = this.project()?.communityLink?.id;

    // Si ya tiene brigada y selecciona una distinta, se REASIGNA
    if (collector.currentBrigadeId && collector.currentBrigadeId !== brigadeId) {
      const reassignRequest = {
        projectCommunityCollectorId: collector.projectCommunityCollectorId,
        newBrigadeId: brigadeId,
        startDate: today,
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
          this.notification.error('Error al reasignar recolector');
        },
      });
      return;
    }

    // Si no tenía brigada asignada, se CREA la asignación
    if (!collector.currentBrigadeId) {
      const request = {
        projectCommunityCollectorId: collector.projectCommunityCollectorId,
        brigadeId,
        startDate: today,
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
          this.notification.error('Error al asignar recolector a brigada');
        },
      });
      return;
    }

    // Si seleccionó la misma brigada que ya tenía, no hacer nada
    this.notification.info('El recolector ya está asignado a esta brigada');
  }

  /**
   * Abre el modal para ver los recolectores de una brigada
   */
  viewBrigadeMembers(brigade: Brigade): void {
    import('../components/brigade-collectors-dialog.component').then((m) => {
      this.dialog.open(m.BrigadeCollectorsDialogComponent, {
        width: '600px',
        maxWidth: '90vw',
        data: {
          brigadeId: brigade.id,
          brigadeName: brigade.name,
        },
      });
    });
  }
}
