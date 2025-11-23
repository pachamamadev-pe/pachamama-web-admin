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
import { forkJoin, interval, Subject, takeUntil, switchMap, takeWhile, catchError, of } from 'rxjs';
import { ProjectsService } from '../services/projects.service';
import { ProductsService } from '../../products/services/products.service';
import { CommunitiesService } from '../../communities/services/communities.service';
import { AreasService } from '../services/areas.service';
import { Project } from '../models/project.model';
import { Product } from '../../products/models/product.model';
import { Community } from '../../communities/models/community.model';
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
  private notification = inject(NotificationService);
  private destroy$ = new Subject<void>();

  private map: L.Map | null = null;
  private geoJsonLayer: L.GeoJSON | null = null;

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

  // Upload state
  uploadingFile = signal(false);
  uploadProgress = signal(0);
  importStatus = signal<ImportStatus | null>(null);
  currentImportId = signal<string | null>(null);
  uploadError = signal<string | null>(null);

  // Etapas del proyecto
  stages: ProjectStage[] = [
    { number: 1, name: 'Relacionamiento Comunitario', key: 'planning' },
    { number: 2, name: 'Pre-Inventario', key: 'pre_inventory' },
    { number: 3, name: 'Inventario', key: 'inventory' },
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
   * Habilita el modo de edición del mapa (permite cargar nuevo shapefile)
   */
  enableEditMode(): void {
    this.hasMap.set(false);
    this.currentGeoJSON.set(null);
    this.destroyMap();
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
}
